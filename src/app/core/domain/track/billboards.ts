import { CountryCode } from '../profile/country';
import { Leg, Track } from './track';
import { START_LINE } from './track-constants';

/**
 * Metros libres alrededor de la salida para el cartel con foto: justo después de la salida lo
 * tapa el HUD durante el semáforo y justo antes se mezcla con la pancarta de meta.
 */
const PHOTO_CLEAR_AFTER_START = 60;
const PHOTO_CLEAR_BEFORE_END = 20;

/** Carteles de líderes como máximo por mapa. */
export const MAX_BILLBOARDS = 2;

/** Un piloto en un cartel: bandera, apodo y su marca ya formateada («27 pts», «0:24.80»). */
export interface BillboardEntry {
  readonly country: CountryCode | null;
  readonly nickname: string;
  readonly value: string;
}

/** Lo que dicen los carteles de un mapa (todos iguales). */
export interface BillboardContent {
  /** Encabezado del líder: «Líder · Liga del viernes», «Líder mundial»… */
  readonly title: string;
  /** Encabezado del segundo: «2.º». */
  readonly secondTitle: string;
  readonly leader: BillboardEntry | null;
  readonly second: BillboardEntry | null;
  /** Texto del cartel cuando nadie tiene tiempo todavía. */
  readonly emptyText: string;
}

/** Metros de recta (sin curvatura) justo antes del cruce: lo que se ve el cartel al llegar. */
export function straightApproach(leg: Leg): number {
  const s = leg.samples;
  let run = 0;
  for (let i = s.length - 1; i > 0 && s[i].curvature === 0 && s[i - 1].curvature === 0; i--) {
    run += Math.hypot(s[i].x - s[i - 1].x, s[i].z - s[i - 1].z);
  }
  return run;
}

/**
 * Tramos cuyo cruce lleva cartel: como mucho uno en cada mitad del mapa, el de la recta de
 * llegada más larga, y nunca el primer cruce (aún no se ha cogido ritmo).
 */
export function billboardLegs(track: Track, max: number = MAX_BILLBOARDS): number[] {
  const half = track.finishProgress / 2;
  const candidates = track.legs.filter((l) => l.junction && l.index > 0);
  const best = (legs: readonly Leg[]) =>
    legs.reduce<Leg | null>(
      (a, l) => (!a || straightApproach(l) > straightApproach(a) ? l : a),
      null,
    );
  const firstHalf = best(candidates.filter((l) => l.startProgress + l.length <= half));
  const secondHalf = best(candidates.filter((l) => l.startProgress + l.length > half));
  return [firstHalf, secondHalf]
    .filter((l): l is Leg => !!l)
    .map((l) => l.index)
    .slice(0, max);
}

/** Sitio del cartel con la foto del líder: en la recta más larga, de frente al llegar. */
export interface PhotoSpot {
  readonly leg: number;
  readonly distance: number;
}

/**
 * Recta más larga del mapa, esté donde esté dentro del tramo (en los circuitos las rectas largas
 * suelen acabar en una curva, no en un cruce). El cartel va al 65 % de la recta para verlo de
 * lejos, y nunca pegado a la salida.
 */
export function photoSpot(track: Track): PhotoSpot {
  const last = track.legs.length - 1;
  let best: PhotoSpot | null = null;
  let bestRun = 0;
  for (const leg of track.legs) {
    for (const { end, run } of straightRuns(leg)) {
      const distance = end - run * 0.35;
      if (leg.index === 0 && distance < START_LINE + PHOTO_CLEAR_AFTER_START) continue;
      if (leg.index === last && leg.length - distance < PHOTO_CLEAR_BEFORE_END) continue;
      if (run > bestRun) {
        best = { leg: leg.index, distance };
        bestRun = run;
      }
    }
  }
  return best ?? { leg: 0, distance: START_LINE + PHOTO_CLEAR_AFTER_START };
}

/** Rectas (tramos sin curvatura seguidos) de un tramo: dónde acaban y cuánto miden. */
export function straightRuns(leg: Leg): { end: number; run: number }[] {
  const s = leg.samples;
  const runs: { end: number; run: number }[] = [];
  let along = 0;
  let run = 0;
  for (let i = 1; i < s.length; i++) {
    const step = Math.hypot(s[i].x - s[i - 1].x, s[i].z - s[i - 1].z);
    along += step;
    if (s[i].curvature === 0 && s[i - 1].curvature === 0) {
      run += step;
    } else {
      if (run > 0) runs.push({ end: along - step, run });
      run = 0;
    }
  }
  if (run > 0) runs.push({ end: along, run });
  return runs;
}

/** Cartel con la foto del líder del torneo (sin foto: su bandera en grande). */
export interface LeaderPhotoContent {
  readonly leader: BillboardEntry;
  /** JPEG en data URL; null si no ha puesto foto. */
  readonly photo: string | null;
}
