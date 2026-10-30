import { Aesthetic, isSynthwave } from '../settings/aesthetic';

/**
 * Canción de carrera. Rutas relativas a public/audio. Tiempos en segundos:
 * empieza en `start` y, al llegar al final (o a `loopEnd`), vuelve a `loopStart`.
 */
export interface MusicTrack {
  readonly file: string;
  readonly start: number;
  readonly loopStart: number;
  readonly loopEnd?: number;
}

/**
 * Motor. «rev»: una subida de vueltas; arranca en el punto que toca por la velocidad y repite
 * el tramo alto. «loop»: un zumbido continuo que se repite entero y sube de tono con la velocidad.
 */
export interface EngineSound {
  readonly file: string;
  readonly mode: 'rev' | 'loop';
}

const track = (file: string, start = 0, loopStart = start): MusicTrack => ({
  file,
  start,
  loopStart,
});

/** Clásico: canciones variadas. Retro y futurista comparten las synthwave. */
const CLASSIC_MUSIC: readonly MusicTrack[] = [
  track('music/classic/tea-tyme.mp3'),
  track('music/classic/future-beat-619128.mp3'),
  track('music/classic/sport-sports-rock-music-622904.mp3', 3),
  track('music/classic/jazz-music-619412.mp3', 8, 10),
];

const SYNTH_MUSIC: readonly MusicTrack[] = [
  track('music/synth/circuit-synthwave-alt-23844.mp3'),
  track('music/synth/80s-synthwave-vibe-loop-22508.mp3', 28),
  track('music/synth/forgotten-melody-cassette-retrowave-beat-411173.mp3', 8),
];

const ENGINES: Record<Aesthetic, EngineSound> = {
  classic: { file: 'engine/classic.mp3', mode: 'rev' },
  retro: { file: 'engine/retro.mp3', mode: 'loop' },
  futurist: { file: 'engine/futurist.mp3', mode: 'loop' },
};

export function musicFor(aesthetic: Aesthetic): readonly MusicTrack[] {
  return isSynthwave(aesthetic) ? SYNTH_MUSIC : CLASSIC_MUSIC;
}

export function engineFor(aesthetic: Aesthetic): EngineSound {
  return ENGINES[aesthetic];
}

/** Canción al azar para una carrera nueva, sin repetir la anterior si hay donde elegir. */
export function pickTrack(
  tracks: readonly MusicTrack[],
  previous: MusicTrack | null,
  random: () => number = Math.random,
): MusicTrack | null {
  const options = tracks.length > 1 ? tracks.filter((t) => t !== previous) : tracks;
  if (!options.length) return null;
  return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
}
