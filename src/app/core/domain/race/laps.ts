import { Track } from '../track/track';

/** Segundos que se ve el cartel de vuelta en el centro de la pantalla. */
export const LAP_BANNER_TIME = 1.6;

/** Cartel al cruzar la línea: nueva vuelta o la última. */
export interface LapBanner {
  readonly kind: 'lap' | 'last';
  /** Vuelta que empieza. */
  readonly lap: number;
  readonly total: number;
  /** Tiempo de la vuelta que acaba de terminar. */
  readonly lapTime: number;
  /** Diferencia con el fantasma en esa vuelta (negativa = más rápido); null sin fantasma. */
  readonly delta: number | null;
  /** Tiempo de carrera en que apareció. */
  readonly at: number;
}

/**
 * Tiempo que tardó el fantasma en la vuelta `lap` (1 = la primera, contada desde la salida como la
 * del jugador). `timeAt` da el instante en que el fantasma alcanzó un progreso; null si no llegó.
 */
export function ghostLapTime(
  track: Track,
  lap: number,
  timeAt: (progress: number) => number | null,
): number | null {
  const end = timeAt(track.lapStartProgress(lap + 1));
  const start = lap === 1 ? 0 : timeAt(track.lapStartProgress(lap));
  return end === null || start === null ? null : end - start;
}

/** Cartel de la vuelta que empieza tras cruzar la línea. */
export function lapBanner(
  track: Track,
  lapTimes: readonly number[],
  raceTime: number,
  timeAt: ((progress: number) => number | null) | null,
): LapBanner | null {
  const c = track.circuit;
  if (!c || lapTimes.length === 0 || lapTimes.length >= c.laps) return null;
  const finished = lapTimes.length;
  const lapTime = lapTimes[finished - 1];
  const ghost = timeAt ? ghostLapTime(track, finished, timeAt) : null;
  const lap = finished + 1;
  return {
    kind: lap === c.laps ? 'last' : 'lap',
    lap,
    total: c.laps,
    lapTime,
    delta: ghost === null ? null : lapTime - ghost,
    at: raceTime,
  };
}

/** Índice de la vuelta más rápida (-1 sin vueltas). */
export function bestLapIndex(lapTimes: readonly number[]): number {
  let best = -1;
  lapTimes.forEach((t, i) => {
    if (best < 0 || t < lapTimes[best]) best = i;
  });
  return best;
}
