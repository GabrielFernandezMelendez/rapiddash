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

const VIEW_STEP = 2;

export interface RoadPoint {
  readonly leg: number;
  readonly distance: number;
  readonly progress: number;
  readonly x: number;
  readonly z: number;
  readonly heading: number;
}

/** La carretera muestreada cada VIEW_STEP metros (sin el interior de los cruces). */
export function roadPoints(track: Track): RoadPoint[] {
  const points: RoadPoint[] = [];
  for (const leg of track.legs) {
    for (let d = 0; d <= leg.length; d += VIEW_STEP) {
      const p = track.pointAt(leg.index, d);
      points.push({ leg: leg.index, distance: d, progress: leg.startProgress + d, ...p });
    }
  }
  return points;
}

/** Hacia dónde mira la carretera con ese rumbo (el mismo convenio que la cámara). */
const forward = (heading: number) => ({ x: Math.sin(heading), z: -Math.cos(heading) });

/** Cartel lejano con la foto: fuera de la carretera, de frente al final de una recta. */
export interface DistantPhotoSpot {
  readonly x: number;
  readonly z: number;
  /** Rumbo de la recta que mira al cartel (el cartel queda de frente al que llega). */
  readonly heading: number;
}

/** Carteles lejanos: rectas mínimas, distancia tras el final de la recta y hueco con la carretera. */
export const DISTANT_PHOTO = {
  minRun: 10,
  minAhead: 250,
  maxAhead: 600,
  /** Desplazamientos laterales que se prueban si justo enfrente está la carretera. */
  lateral: [0, 30, -30, 60, -60, 90, -90, 120, -120],
  /** Ángulo máximo con la recta visto desde su mitad: más, y se sale de la pantalla. */
  maxAngle: (13 * Math.PI) / 180,
  /** Distancia mínima del cartel al eje de cualquier tramo (el cartel mide 63 m de ancho). */
  roadClearance: 60,
  /** Distancia mínima entre los dos carteles lejanos. */
  apart: 150,
} as const;

/**
 * Carteles con la foto del líder: muy grandes, lejos y al fondo de las rectas más largas, en la
 * prolongación de la recta (a 250 m o más del final: se quedan mucho tiempo en pantalla, también
 * al girar) o poco desviados, lo más cerca posible sin acercarse a la carretera ni a otro cartel.
 */
export function distantPhotoSpots(track: Track, count = 4): DistantPhotoSpot[] {
  const road = roadPoints(track);
  const runs = track.legs
    .flatMap((leg) => straightRuns(leg).map((r) => ({ leg, ...r })))
    .filter((r) => r.run >= DISTANT_PHOTO.minRun)
    .sort((a, b) => b.run - a.run);
  const spots: DistantPhotoSpot[] = [];
  for (const r of runs) {
    if (spots.length === count) break;
    const end = track.pointAt(r.leg.index, r.end);
    const f = forward(end.heading);
    const spot = distantSpotAfter(end.x, end.z, f, r.run, road, spots);
    if (spot) spots.push({ ...spot, heading: end.heading });
  }
  return spots;
}

/** El sitio más cercano tras el final de la recta que se vea desde ella y no pise la carretera. */
function distantSpotAfter(
  ex: number,
  ez: number,
  f: { x: number; z: number },
  run: number,
  road: readonly RoadPoint[],
  taken: readonly DistantPhotoSpot[],
): { x: number; z: number } | null {
  for (let ahead = DISTANT_PHOTO.minAhead; ahead <= DISTANT_PHOTO.maxAhead; ahead += 5) {
    for (const side of DISTANT_PHOTO.lateral) {
      // Visto desde la mitad de la recta, que no se salga por el lado de la pantalla
      if (Math.atan2(Math.abs(side), ahead + run / 2) > DISTANT_PHOTO.maxAngle) continue;
      // Derecha de la recta: (cos h, sin h) = (-f.z, f.x)
      const x = ex + f.x * ahead - f.z * side;
      const z = ez + f.z * ahead + f.x * side;
      if (road.some((p) => Math.hypot(p.x - x, p.z - z) < DISTANT_PHOTO.roadClearance)) continue;
      if (taken.some((o) => Math.hypot(o.x - x, o.z - z) < DISTANT_PHOTO.apart)) continue;
      return { x, z };
    }
  }
  return null;
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
