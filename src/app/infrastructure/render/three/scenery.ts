import { TRACK_HALF_WIDTH } from '../../../core/domain/track/track-constants';
import { Track } from '../../../core/domain/track/track';
import { ScenePalette, seededRandom } from './themes';

const MAX_PROPS = 320;

export interface ScenerySpot {
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly spin: number;
  readonly tree: boolean;
}

export interface SceneryLayout {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly spots: readonly ScenerySpot[];
}

/**
 * Límites de la pista y posiciones del decorado: aleatorias pero reproducibles, fuera de la
 * pista y no demasiado lejos de ella (palmeras, pirámides y cristales del mundo synthwave).
 */
export function sceneryLayout(track: Track, palette: ScenePalette): SceneryLayout {
  const s = track.legs.flatMap((l) => l.samples);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of s) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  const rand = seededRandom(palette.seed);
  const spots: ScenerySpot[] = [];
  const margin = 40;
  for (let tries = 0; tries < MAX_PROPS * 12 && spots.length < MAX_PROPS; tries++) {
    const x = minX - margin + rand() * (maxX - minX + margin * 2);
    const z = minZ - margin + rand() * (maxZ - minZ + margin * 2);
    let best = Infinity;
    for (let i = 0; i < s.length; i += 4)
      best = Math.min(best, (s[i].x - x) ** 2 + (s[i].z - z) ** 2);
    const d = Math.sqrt(best);
    if (d > TRACK_HALF_WIDTH + 2.5 && d < TRACK_HALF_WIDTH + 36) {
      spots.push({
        x,
        z,
        scale: 0.7 + rand() * 0.8,
        spin: rand(),
        tree: rand() < palette.treeRatio,
      });
    }
  }
  return { minX, maxX, minZ, maxZ, spots };
}
