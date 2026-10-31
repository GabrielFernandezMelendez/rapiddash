import { AudioFrame, AudioPort } from '../../core/application/ports/out/audio.port';
import {
  EngineSound,
  engineFor,
  musicFor,
  MusicTrack,
  pickTrack,
} from '../../core/domain/audio/soundtrack';
import { Aesthetic } from '../../core/domain/settings/aesthetic';
import { DEFAULT_VOLUMES, VolumeChannel, Volumes } from '../../core/domain/settings/volume';

/** Carpeta de los sonidos (public/audio). Si falta un archivo, esa parte queda en silencio. */
const AUDIO_DIR = 'audio/';

const MUSIC_VOLUME = 0.45;
/** Tras la meta la música baja para no tapar la pantalla de resultados. */
const MUSIC_FINISHED_VOLUME = 0.2;
/** El motor queda por debajo de la música: acompaña sin tapar. */
const ENGINE_VOLUME = 0.22;
/** Constantes de tiempo (s) de los fundidos: subida suave, bajada rápida al soltar. */
const ENGINE_FADE_IN = 0.12;
const ENGINE_FADE_OUT = 0.06;
/**
 * El sonido del motor es una subida de vueltas. Se arranca en el punto del clip que corresponde
 * a la velocidad actual, y al llegar al final repite el tramo de vueltas altas.
 */
const ENGINE_REV_PORTION = 0.55;
/** Motor en bucle (retro y nave): el tono sube con la velocidad entre estos dos valores. */
const ENGINE_LOOP_RATE_MIN = 0.85;
const ENGINE_LOOP_RATE_MAX = 1.3;
/** Fundido entre canciones al repetir la carrera (s). */
const SONG_FADE = 0.5;
/** Duración del ejemplo de Ajustes (s). */
const PREVIEW_LENGTH = 1.6;

/** Gestos que cuentan para desbloquear el audio (iOS solo acepta algunos). */
const UNLOCK_EVENTS = ['pointerdown', 'touchend', 'click', 'keydown'] as const;

/** Última canción que sonó, también entre carreras: la siguiente nunca es la misma. */
let lastTrack: MusicTrack | null = null;

export class WebAudioAdapter extends AudioPort {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private engineBuffer: AudioBuffer | null = null;
  private engineSound: EngineSound | null = null;
  /** Voz del motor en curso: cada acelerón crea una con su propio fundido. */
  private engine: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private tracks: readonly MusicTrack[] = [];
  /** Canción en curso, con su propio volumen para fundirla al cambiar. */
  private song: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** Cada canción pedida tiene un número: si llega tarde una carga antigua, se descarta. */
  private songRequest = 0;
  private disposed = false;
  /** Volumen elegido en Ajustes: multiplica el de la mezcla. */
  private volumes: Volumes = DEFAULT_VOLUMES;
  private previewVoice: AudioBufferSourceNode | null = null;
  /** Qué suena: la música del menú (y de qué estética) o una carrera. */
  private mode: 'idle' | 'menu' | 'race' = 'idle';
  private menuAesthetic: Aesthetic | null = null;

  start(aesthetic: Aesthetic): void {
    if (!this.ensureContext()) return;
    this.mode = 'race';
    this.menuAesthetic = null;
    this.restoreMusicLevel();
    this.tracks = musicFor(aesthetic);
    this.engineSound = engineFor(aesthetic);
    this.nextSong();
    void this.load(this.engineSound.file).then((buffer) => (this.engineBuffer = buffer));
  }

  setVolumes(volumes: Volumes): void {
    this.volumes = volumes;
    const now = this.ctx?.currentTime ?? 0;
    this.musicGain?.gain.setTargetAtTime(MUSIC_VOLUME * volumes.music, now, 0.05);
    this.engineGain?.gain.setTargetAtTime(ENGINE_VOLUME * volumes.effects, now, 0.05);
  }

  /** Un trozo de la primera canción de la estética o del motor, al volumen elegido. */
  preview(channel: VolumeChannel, volumes: Volumes, aesthetic: Aesthetic): void {
    if (!this.ensureContext()) return;
    this.setVolumes(volumes);
    void this.ctx!.resume().catch(() => undefined);
    const music = channel === 'music';
    const file = music ? musicFor(aesthetic)[0]?.file : engineFor(aesthetic).file;
    const offset = music ? (musicFor(aesthetic)[0]?.start ?? 0) : 0;
    if (!file) return;
    void this.load(file).then((buffer) => {
      const ctx = this.ctx;
      const out = music ? this.musicGain : this.engineGain;
      if (!buffer || !ctx || !out) return;
      this.previewVoice?.stop();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + 0.1);
      gain.gain.setValueAtTime(1, now + PREVIEW_LENGTH - 0.3);
      gain.gain.linearRampToValueAtTime(0, now + PREVIEW_LENGTH);
      source.connect(gain);
      gain.connect(out);
      source.start(now, Math.min(offset, buffer.duration), PREVIEW_LENGTH);
      source.onended = () => gain.disconnect();
      this.previewVoice = source;
    });
  }

  playMenu(aesthetic: Aesthetic): void {
    if (this.mode === 'race') return;
    if (this.mode === 'menu' && this.menuAesthetic === aesthetic) return;
    if (!this.ensureContext()) return;
    this.mode = 'menu';
    this.menuAesthetic = aesthetic;
    this.restoreMusicLevel();
    this.tracks = musicFor(aesthetic);
    this.nextSong();
  }

  stopRace(): void {
    if (this.mode !== 'race') return;
    this.mode = 'idle';
    this.stopEngine();
    this.songRequest++;
    if (this.ctx) this.fadeOutSong(this.ctx.currentTime);
  }

  nextSong(): void {
    const track = pickTrack(this.tracks, lastTrack);
    if (!track || !this.ctx) return;
    lastTrack = track;
    const request = ++this.songRequest;
    void this.load(track.file).then((buffer) => {
      if (buffer && request === this.songRequest) this.playSong(track, buffer);
    });
  }

  update(frame: AudioFrame): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;

    this.musicGain.gain.setTargetAtTime(
      (frame.phase === 'finished' ? MUSIC_FINISHED_VOLUME : MUSIC_VOLUME) * this.volumes.music,
      now,
      0.4,
    );

    // El motor solo suena mientras se acelera; el volumen sube con la velocidad
    const accelerating = frame.accelerating && frame.phase === 'racing';
    if (accelerating && !this.engine) this.startEngine(frame.speedRatio);
    if (!accelerating && this.engine) this.stopEngine();
    this.engine?.gain.gain.setTargetAtTime(0.35 + 0.65 * frame.speedRatio, now, ENGINE_FADE_IN);
    if (this.engine && this.engineSound?.mode === 'loop') {
      const rate =
        ENGINE_LOOP_RATE_MIN + (ENGINE_LOOP_RATE_MAX - ENGINE_LOOP_RATE_MIN) * frame.speedRatio;
      this.engine.source.playbackRate.setTargetAtTime(rate, now, 0.15);
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const type of UNLOCK_EVENTS) window.removeEventListener(type, this.unlock);
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.engine = null;
  }

  /** Crea el contexto de audio y la mezcla (música y motor) la primera vez. */
  private ensureContext(): boolean {
    if (this.ctx) return true;
    const Ctor =
      globalThis.AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor || this.disposed) return false;
    this.ctx = new Ctor();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = MUSIC_VOLUME * this.volumes.music;
    this.musicGain.connect(this.ctx.destination);
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = ENGINE_VOLUME * this.volumes.effects;
    this.engineGain.connect(this.ctx.destination);
    // iOS: que suene aunque el móvil esté en silencio, como un juego (Safari 16.4+)
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    // Los navegadores móviles solo dejan sonar el audio tras un gesto del jugador
    for (const type of UNLOCK_EVENTS) window.addEventListener(type, this.unlock);
    void this.ctx.resume().catch(() => undefined);
    return true;
  }

  /** Tras la meta la música baja; al volver al menú o a otra carrera, vuelve a su nivel. */
  private restoreMusicLevel(): void {
    if (!this.ctx || !this.musicGain) return;
    this.musicGain.gain.setTargetAtTime(
      MUSIC_VOLUME * this.volumes.music,
      this.ctx.currentTime,
      0.2,
    );
  }

  private readonly unlock = () => {
    void this.ctx?.resume().catch(() => undefined);
  };

  private async load(file: string): Promise<AudioBuffer | null> {
    try {
      const res = await fetch(AUDIO_DIR + file);
      if (!res.ok || !this.ctx) return null;
      const data = await res.arrayBuffer();
      if (this.disposed || !this.ctx) return null;
      return await this.ctx.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  /** Empieza en `start` y repite desde `loopStart`; la anterior se funde. */
  private playSong(track: MusicTrack, buffer: AudioBuffer): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicGain) return;
    const now = ctx.currentTime;
    this.fadeOutSong(now);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = Math.min(track.loopStart, buffer.duration);
    source.loopEnd = Math.min(track.loopEnd ?? buffer.duration, buffer.duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + SONG_FADE);
    source.connect(gain);
    gain.connect(this.musicGain);
    source.start(now, Math.min(track.start, buffer.duration));
    this.song = { source, gain };
  }

  private fadeOutSong(now: number): void {
    const old = this.song;
    if (!old) return;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0, now + SONG_FADE);
    old.source.stop(now + SONG_FADE + 0.05);
    old.source.onended = () => old.gain.disconnect();
    this.song = null;
  }

  private startEngine(speedRatio: number): void {
    const ctx = this.ctx;
    const buffer = this.engineBuffer;
    if (!ctx || !buffer || !this.engineGain) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(this.engineGain);
    if (this.engineSound?.mode === 'loop') {
      // Zumbido continuo desde el principio; el tono lo ajusta update() según la velocidad
      source.playbackRate.value =
        ENGINE_LOOP_RATE_MIN + (ENGINE_LOOP_RATE_MAX - ENGINE_LOOP_RATE_MIN) * speedRatio;
      source.start();
    } else {
      source.loopStart = buffer.duration * ENGINE_REV_PORTION;
      source.loopEnd = buffer.duration;
      // Empieza en las vueltas que corresponden a la velocidad actual
      source.start(0, Math.min(speedRatio, 0.98) * buffer.duration * ENGINE_REV_PORTION);
    }
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
