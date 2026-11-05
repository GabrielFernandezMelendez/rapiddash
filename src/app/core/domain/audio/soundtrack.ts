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

/** Motor: un zumbido continuo que se repite entero y sube de tono con la velocidad. */
export interface EngineSound {
  readonly file: string;
}

const track = (file: string, start = 0, loopStart = start): MusicTrack => ({
  file,
  start,
  loopStart,
});

/** Canciones synthwave de carrera y de los menús. */
export const MUSIC: readonly MusicTrack[] = [
  track('music/synth/circuit-synthwave-alt-23844.mp3'),
  track('music/synth/80s-synthwave-vibe-loop-22508.mp3', 28),
  track('music/synth/forgotten-melody-cassette-retrowave-beat-411173.mp3', 8),
];

export const ENGINE: EngineSound = { file: 'engine/retro.mp3' };

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
