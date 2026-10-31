import { CountryCode } from '../profile/country';
import { Leg, Track } from './track';

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

/** Recta más larga del mapa; el cartel va en su primer tercio largo para verlo bien de lejos. */
export function photoSpot(track: Track): PhotoSpot {
  const leg = track.legs.reduce((a, l) => (straightApproach(l) > straightApproach(a) ? l : a));
  return { leg: leg.index, distance: leg.length - straightApproach(leg) * 0.35 };
}

/** Cartel con la foto del líder del torneo (sin foto: su bandera en grande). */
export interface LeaderPhotoContent {
  readonly leader: BillboardEntry;
  /** JPEG en data URL; null si no ha puesto foto. */
  readonly photo: string | null;
}
