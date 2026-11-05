import { autopilotTime } from '../race/autopilot';
import { RaceMap, trackOf } from '../track/race-map';
import { MedalTargets, medalTargets } from './medals';

const cache = new Map<string, MedalTargets>();

/**
 * Tiempos objetivo de un mapa, sacados del piloto automático (se calculan una vez y se guardan).
 * Los mapas de prueba no tienen medallas.
 */
export function mapMedalTargets(map: RaceMap): MedalTargets | null {
  if (map.experimental) return null;
  let t = cache.get(map.id);
  if (!t) {
    t = medalTargets(autopilotTime(trackOf(map)));
    cache.set(map.id, t);
  }
  return t;
}
