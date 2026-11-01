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

/** Cámara de la carrera y altura del centro del cartel con foto (los del render en 3D). */
export const PHOTO_VIEW = {
  cameraBack: 12.5,
  cameraHeight: 9.2,
  /** Mitad del ángulo horizontal que se ve en vertical (con margen para que no quede al borde). */
  halfAngle: (16 * Math.PI) / 180,
  /** Altura del centro del cartel. */
  centerHeight: 12,
  minDistance: 20,
  maxDistance: 150,
  /** Ángulo máximo entre la carretera en el cartel y la mirada: más, y se ve de canto. */
  facing: (75 * Math.PI) / 180,
} as const;

/** Distancia mínima por la carretera entre los dos carteles con foto. */
const PHOTO_SPOTS_GAP = 100;
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

const angleBetween = (ax: number, az: number, bx: number, bz: number) =>
  Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz)))));

/**
 * Metros de carretera durante los que la cámara ve un cartel puesto en `target`: delante, ni muy
 * cerca ni muy lejos y de frente. En un circuito se mira también el final de la vuelta.
 */
export function photoViewMeters(points: readonly RoadPoint[], target: number, closed: boolean): number {
  const p = points[target];
  const face = forward(p.heading);
  const lookBack = Math.ceil((PHOTO_VIEW.maxDistance + PHOTO_VIEW.cameraBack + 60) / VIEW_STEP);
  let meters = 0;
  for (let k = 1; k <= lookBack; k++) {
    const j = target - k;
    if (j < 0 && !closed) break;
    const c = points[(j + points.length) % points.length];
    const f = forward(c.heading);
    const camX = c.x - f.x * PHOTO_VIEW.cameraBack;
    const camZ = c.z - f.z * PHOTO_VIEW.cameraBack;
    const dx = p.x - camX;
    const dz = p.z - camZ;
    const dist = Math.hypot(dx, dz);
    if (dist < PHOTO_VIEW.minDistance || dist > PHOTO_VIEW.maxDistance) continue;
    if (angleBetween(f.x, f.z, dx, dz) > PHOTO_VIEW.halfAngle) continue;
    if (angleBetween(face.x, face.z, dx, dz) > PHOTO_VIEW.facing) continue;
    meters += VIEW_STEP;
  }
  return meters;
}

/**
 * Sitios de los carteles con foto: los dos donde la cámara los ve durante más metros (pueden
 * estar en curva), separados al menos PHOTO_SPOTS_GAP metros por la carretera y nunca pegados a
 * la salida. Si no hay ninguno que se vea, el de la recta más larga.
 */
export function photoSpots(track: Track, closed = false): PhotoSpot[] {
  const points = roadPoints(track);
  const total = points.at(-1)!.progress;
  const last = track.legs.length - 1;
  const scored = points
    .map((p, i) => ({ p, meters: photoViewMeters(points, i, closed) }))
    .filter(({ p, meters }) => {
      if (meters === 0) return false;
      if (p.leg === 0 && p.distance < START_LINE + PHOTO_CLEAR_AFTER_START) return false;
      return !(p.leg === last && track.legs[last].length - p.distance < PHOTO_CLEAR_BEFORE_END);
    })
    .sort((a, b) => b.meters - a.meters);
  const apart = (a: RoadPoint, b: RoadPoint) => {
    const gap = Math.abs(a.progress - b.progress);
    return Math.min(gap, closed ? total - gap : gap) >= PHOTO_SPOTS_GAP;
  };
  const first = scored[0];
  if (!first) return [photoSpot(track)];
  const second = scored.find(({ p }) => apart(p, first.p));
  return [first, second]
    .filter((s): s is (typeof scored)[number] => !!s)
    .map(({ p }) => ({ leg: p.leg, distance: p.distance }));
}

/** Cartel lejano con la foto: fuera de la carretera, de frente al final de una recta. */
export interface DistantPhotoSpot {
  readonly x: number;
  readonly z: number;
  /** Rumbo de la recta que mira al cartel (el cartel queda de frente al que llega). */
  readonly heading: number;
}

/** Carteles lejanos: rectas mínimas, distancia tras el final de la recta y hueco con la carretera. */
export const DISTANT_PHOTO = {
  minRun: 20,
  minAhead: 45,
  maxAhead: 260,
  /** Desplazamientos laterales que se prueban si justo enfrente está la carretera. */
  lateral: [0, 20, -20, 40, -40, 60, -60],
  /** Ángulo máximo con la recta visto desde su mitad: más, y se sale de la pantalla. */
  maxAngle: (13 * Math.PI) / 180,
  /** Distancia mínima del cartel al eje de cualquier tramo (el cartel mide 14 m de ancho). */
  roadClearance: 22,
  /** Distancia mínima entre los dos carteles lejanos. */
  apart: 80,
  /** Separación mínima, vista desde la recta, con los carteles sobre la carretera (que no se tapen). */
  minSeparation: (10 * Math.PI) / 180,
} as const;

/**
 * Dos carteles lejanos con la foto: al fondo de las dos rectas más largas, en la prolongación de
 * la recta (se ven de frente todo el rato que se va por ella), lo más cerca posible sin pisar la
 * carretera ni otro tramo, y sin quedar detrás de los carteles de `avoid` (los de sobre la carretera).
 */
export function distantPhotoSpots(
  track: Track,
  avoid: readonly { x: number; z: number }[] = [],
): DistantPhotoSpot[] {
  const road = roadPoints(track);
  const runs = track.legs
    .flatMap((leg) => straightRuns(leg).map((r) => ({ leg, ...r })))
    .filter((r) => r.run >= DISTANT_PHOTO.minRun)
    .sort((a, b) => b.run - a.run);
  const spots: DistantPhotoSpot[] = [];
  for (const r of runs) {
    if (spots.length === 2) break;
    const end = track.pointAt(r.leg.index, r.end);
    const f = forward(end.heading);
    const spot = distantSpotAfter(end.x, end.z, f, r.run, road, spots, avoid);
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
  avoid: readonly { x: number; z: number }[],
): { x: number; z: number } | null {
  // Desde la mitad de la recta: lo que se ve delante
  const mx = ex - f.x * (run / 2);
  const mz = ez - f.z * (run / 2);
  const hidden = (x: number, z: number) =>
    avoid.some((o) => {
      const ahead = (o.x - mx) * f.x + (o.z - mz) * f.z;
      return ahead > 0 && angleBetween(x - mx, z - mz, o.x - mx, o.z - mz) < DISTANT_PHOTO.minSeparation;
    });
  for (let ahead = DISTANT_PHOTO.minAhead; ahead <= DISTANT_PHOTO.maxAhead; ahead += 5) {
    for (const side of DISTANT_PHOTO.lateral) {
      // Visto desde la mitad de la recta, que no se salga por el lado de la pantalla
      if (Math.atan2(Math.abs(side), ahead + run / 2) > DISTANT_PHOTO.maxAngle) continue;
      // Derecha de la recta: (cos h, sin h) = (-f.z, f.x)
      const x = ex + f.x * ahead - f.z * side;
      const z = ez + f.z * ahead + f.x * side;
      if (road.some((p) => Math.hypot(p.x - x, p.z - z) < DISTANT_PHOTO.roadClearance)) continue;
      if (taken.some((o) => Math.hypot(o.x - x, o.z - z) < DISTANT_PHOTO.apart)) continue;
      if (hidden(x, z)) continue;
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
