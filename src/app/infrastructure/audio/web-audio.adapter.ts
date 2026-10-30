import { AudioFrame, AudioPort } from '../../core/application/ports/out/audio.port';

/** Archivos en public/audio. Si faltan, el juego funciona en silencio. */
export const AUDIO_FILES = {
  music: 'audio/race-music.mp3',
  engine: 'audio/engine.mp3',
} as const;

const MUSIC_VOLUME = 0.45;
/** Tras la meta la música baja para no tapar la pantalla de resultados. */
const MUSIC_FINISHED_VOLUME = 0.2;
const ENGINE_VOLUME = 0.7;
/** Constantes de tiempo (s) de los fundidos: subida suave, bajada rápida al soltar. */
const ENGINE_FADE_IN = 0.12;
const ENGINE_FADE_OUT = 0.06;
/**
 * El sonido del motor es una subida de vueltas. Se arranca en el punto del clip que corresponde
 * a la velocidad actual, y al llegar al final repite el tramo de vueltas altas.
 */
const ENGINE_REV_PORTION = 0.55;

export class WebAudioAdapter extends AudioPort {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineBuffer: AudioBuffer | null = null;
  /** Voz del motor en curso: cada acelerón crea una con su propio fundido. */
  private engine: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private musicStarted = false;
  private disposed = false;

  start(): void {
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = MUSIC_VOLUME;
    this.musicGain.connect(this.ctx.destination);
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = ENGINE_VOLUME;
    this.engineGain.connect(this.ctx.destination);

    // Los navegadores móviles solo dejan sonar el audio tras un gesto del jugador
    window.addEventListener('pointerdown', this.unlock);
    window.addEventListener('keydown', this.unlock);
    void this.ctx.resume().catch(() => undefined);

    void this.load(AUDIO_FILES.music).then((buffer) => buffer && this.playMusic(buffer));
    void this.load(AUDIO_FILES.engine).then((buffer) => (this.engineBuffer = buffer));
  }

  update(frame: AudioFrame): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;

    this.musicGain.gain.setTargetAtTime(
      frame.phase === 'finished' ? MUSIC_FINISHED_VOLUME : MUSIC_VOLUME,
      now,
      0.4,
    );

    // El motor solo suena mientras se acelera; el volumen sube con la velocidad
    const accelerating = frame.accelerating && frame.phase === 'racing';
    if (accelerating && !this.engine) this.startEngine(frame.speedRatio);
    if (!accelerating && this.engine) this.stopEngine();
    this.engine?.gain.gain.setTargetAtTime(0.35 + 0.65 * frame.speedRatio, now, ENGINE_FADE_IN);
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('keydown', this.unlock);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.engine = null;
  }

  private readonly unlock = () => {
    void this.ctx?.resume().catch(() => undefined);
  };

  private async load(url: string): Promise<AudioBuffer | null> {
    try {
      const res = await fetch(url);
      if (!res.ok || !this.ctx) return null;
      const data = await res.arrayBuffer();
      if (this.disposed || !this.ctx) return null;
      return await this.ctx.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  private playMusic(buffer: AudioBuffer): void {
    if (!this.ctx || !this.musicGain || this.musicStarted) return;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start();
    this.musicStarted = true;
  }

  private startEngine(speedRatio: number): void {
    const ctx = this.ctx;
    const buffer = this.engineBuffer;
    if (!ctx || !buffer || !this.engineGain) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = buffer.duration * ENGINE_REV_PORTION;
    source.loopEnd = buffer.duration;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.engineGain);
    // Empieza en las vueltas que corresponden a la velocidad actual
    source.start(0, Math.min(speedRatio, 0.98) * buffer.duration * ENGINE_REV_PORTION);
    this.engine = { source, gain };
  }

  private stopEngine(): void {
    const ctx = this.ctx;
    const voice = this.engine;
    if (!ctx || !voice) return;
    const now = ctx.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, ENGINE_FADE_OUT);
    voice.source.stop(now + ENGINE_FADE_OUT * 6);
    voice.source.onended = () => voice.gain.disconnect();
    this.engine = null;
  }
}
