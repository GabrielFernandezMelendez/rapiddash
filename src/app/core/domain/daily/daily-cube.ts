import { LANE_WIDTH } from '../track/track-constants';
import { Track } from '../track/track';

/**
 * Cubo azul del mapa del día: el mismo carril y el mismo punto de la vuelta para todos ese día.
 * Se coge pasando por él (una vez al día) y regala un coche o un efecto cerrado al azar.
 */
export interface DailyCube {
  /** Metros desde el principio de la vuelta (en un circuito sale en el mismo sitio cada vuelta). */
  readonly progress: number;
  /** Centro del carril (m desde el eje; negativo a la izquierda). */
  readonly lateral: number;
}

/** Ventana para cogerlo: a lo largo de la pista y de lado (medio carril). */
const PICK_ALONG = 1.6;
const PICK_SIDE = LANE_WIDTH * 0.5;
/** No sale pegado a un cruce, a un embudo ni a la salida. */
const MARGIN = 12;
const FROM_START = 40;

/** Pseudoaleatorio con semilla: la fecha da siempre el mismo sitio. */
function seeded(key: string): () => number {
  let s = 0;
  for (const ch of key) s = (Math.imul(s, 31) + ch.charCodeAt(0)) | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dónde está el cubo el día `key` (AAAA-MM-DD) en una vuelta de `lap`: en un tramo de ancho
 * constante, lejos de sus extremos, y en uno de sus carriles.
 */
export function dailyCube(key: string, lap: Track): DailyCube {
  const random = seeded(key);
  const spots: { progress: number; halfWidth: number }[] = [];
  for (const leg of lap.legs) {
    for (let d = MARGIN; d <= leg.length - MARGIN; d += 2) {
      const progress = leg.startProgress + d;
      if (progress < FROM_START) continue;
      const hw = lap.halfWidthAt(leg.index, d);
      // Ancho estable alrededor (fuera de los embudos)
      const steady = [-MARGIN, MARGIN].every(
        (o) => Math.abs(lap.halfWidthAt(leg.index, d + o) - hw) < 0.01,
      );
      if (steady) spots.push({ progress, halfWidth: hw });
    }
  }
  const spot = spots[Math.floor(random() * spots.length)] ?? { progress: FROM_START, halfWidth: 5.5 };
  const lanes = Math.round((spot.halfWidth * 2) / LANE_WIDTH);
  const lane = Math.floor(random() * lanes);
  return { progress: spot.progress, lateral: -spot.halfWidth + LANE_WIDTH * (lane + 0.5) };
}

/** ¿El coche pasa por el cubo? `progress` es el de la carrera (en un circuito, de todas las vueltas). */
export function touchesCube(
  cube: DailyCube,
  progress: number,
  lateral: number,
  lapLength: number | null,
): boolean {
  const p = lapLength ? ((progress % lapLength) + lapLength) % lapLength : progress;
  return Math.abs(p - cube.progress) <= PICK_ALONG && Math.abs(lateral - cube.lateral) <= PICK_SIDE;
}
