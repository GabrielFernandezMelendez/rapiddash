import { Track } from './track';

/**
 * Relieve de un circuito «entre colinas». Solo es visual: la física sigue siendo plana (el coche
 * no acelera al bajar ni frena al subir), así que los tiempos son comparables.
 *
 * La carretera sube y baja con la vuelta (ondas con un número entero de ciclos por vuelta, para que
 * cierre en la salida) y no se inclina de lado. Fuera de la carretera el suelo sigue su altura y, a
 * partir de unos metros, se levanta en lomas; lejos de la pista todo vuelve a ser llano (ahí van
 * los carteles con la foto del líder).
 */
export interface TerrainSpec {
  /** Altura máxima de la carretera sobre el llano (m). */
  readonly amplitude: number;
  /** Cambia la forma de las ondas y de las lomas. */
  readonly seed: number;
  /** Ciclos por vuelta de las dos ondas de la carretera (por defecto 2 y 3; más = más empinado). */
  readonly waves?: readonly [number, number];
  /** Mundo curvado alrededor del jugador (solo visual). */
  readonly curve?: WorldCurve;
}

/**
 * Curvatura del mundo, siempre alrededor de la cámara (como en los juegos de «mundo curvo»):
 * - planet: el suelo cae como si fuera un planeta pequeño de ese radio; el horizonte se curva
 *   hacia abajo.
 * - tube: lo que queda a los lados se enrolla hacia arriba como el interior de un tubo de ese
 *   radio; la pista lejana se ve en las paredes y por encima.
 */
export interface WorldCurve {
  readonly kind: 'planet' | 'tube';
  /** Radio (m). */
  readonly radius: number;
}

export interface Terrain {
  /** Altura de la carretera y de lo que hay sobre el terreno en un punto del mundo (m). */
  height(x: number, z: number): number;
  /**
   * Altura del suelo (el plano del terreno): igual que `height`, pero hundido junto a la
   * carretera, para que entre sus vértices (más separados) no asome por encima del asfalto.
   */
  ground(x: number, z: number): number;
  /** Altura máxima que alcanza la carretera (para subir los carteles lejanos por encima). */
  readonly maxRoad: number;
}

/** Sin relieve: todo a 0. */
export const FLAT: Terrain = { height: () => 0, ground: () => 0, maxRoad: 0 };

/** Ancho a cada lado del eje en el que el suelo es la carretera (sin inclinarse de lado). */
const ROAD_FLAT = 9;
/** A partir de aquí el suelo ya es loma; entre medias se mezcla. */
const HILL_FROM = 55;
/** Distancia a la pista desde la que el relieve se apaga y todo es llano. */
const FADE_FROM = 90;
const FADE_TO = 190;
/** Altura de las lomas fuera de la carretera respecto a la amplitud. */
const HILL_SCALE = 1.15;
const STEP = 4;
/** Cuánto se hunde el suelo bajo la carretera (los muros tapan el hueco). */
const GROUND_SINK = 0.8;

interface RoadSample {
  readonly x: number;
  readonly z: number;
  readonly h: number;
}

const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** Altura de la carretera según lo recorrido en la vuelta: dos ondas que cierran en la salida. */
export function roadHeight(progress: number, lapLength: number, spec: TerrainSpec): number {
  const t = (progress / lapLength) * Math.PI * 2;
  const a = spec.seed * 1.7;
  const [w1, w2] = spec.waves ?? [2, 3];
  const wave = 0.65 * Math.sin(w1 * t + a) + 0.35 * Math.sin(w2 * t + a * 2.3);
  // De 0 a `amplitude`: la carretera nunca baja del llano
  return (spec.amplitude * (wave + 1)) / 2;
}

export function buildTerrain(lap: Track, spec: TerrainSpec): Terrain {
  const lapLength = lap.legs.reduce((sum, l) => sum + l.length, 0);
  const road: RoadSample[] = [];
  for (const leg of lap.legs) {
    for (let d = 0; d < leg.length; d += STEP) {
      const p = lap.pointAt(leg.index, d);
      road.push({ x: p.x, z: p.z, h: roadHeight(leg.startProgress + d, lapLength, spec) });
    }
  }
  const s = spec.seed;
  const hills = (x: number, z: number) =>
    spec.amplitude *
    HILL_SCALE *
    (0.55 +
      0.25 * Math.sin(x * 0.031 + s) * Math.cos(z * 0.027 - s * 0.7) +
      0.2 * Math.sin((x + z) * 0.053 + s * 2.1));

  const sample = (x: number, z: number): { h: number; d: number } => {
    // Altura de la carretera cerca: media de los puntos más cercanos, pesando mucho los cercanos
    // (así dos tramos que pasan cerca no hacen un escalón entre ellos)
    let nearest = Infinity;
    let weight = 0;
    let sum = 0;
    for (const r of road) {
      const dx = r.x - x;
      const dz = r.z - z;
      const d2 = dx * dx + dz * dz;
      if (d2 < nearest) nearest = d2;
      const w = 1 / (d2 * d2 + 1e-3);
      weight += w;
      sum += w * r.h;
    }
    const d = Math.sqrt(nearest);
    const roadH = sum / weight;
    const fade = 1 - smooth((d - FADE_FROM) / (FADE_TO - FADE_FROM));
    if (fade <= 0) return { h: 0, d };
    const mix = smooth((d - ROAD_FLAT) / (HILL_FROM - ROAD_FLAT));
    return { h: (roadH * (1 - mix) + Math.max(roadH, hills(x, z)) * mix) * fade, d };
  };
  return {
    height: (x, z) => sample(x, z).h,
    ground: (x, z) => {
      const { h, d } = sample(x, z);
      return h - GROUND_SINK * (1 - smooth((d - 7) / 12));
    },
    maxRoad: spec.amplitude,
  };
}
