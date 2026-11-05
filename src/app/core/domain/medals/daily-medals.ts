import { dailyMapId, dailyPool } from '../daily/daily-map';
import { RaceMap } from '../track/race-map';
import { mapMedalTargets } from './map-medals';
import { Medal, MEDALS, medalFor, MedalTargets } from './medals';

/** Un día jugado del mapa del día con la medalla que dio mi mejor tiempo. */
export interface DailyMedal {
  readonly key: string;
  readonly map: RaceMap;
  readonly targets: MedalTargets;
  readonly best: number;
  readonly medal: Medal | null;
}

/** Los `n` días anteriores a `todayKey` y él mismo, del más reciente al más antiguo (AAAA-MM-DD). */
export function recentDayKeys(todayKey: string, n: number): string[] {
  const [y, m, d] = todayKey.split('-').map(Number);
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10),
  );
}

/** Circuito que tocó ese día (el mismo cálculo que el mapa del día). */
export function dailyMapOf(key: string, maps: readonly RaceMap[]): RaceMap | undefined {
  const pool = dailyPool(key, maps);
  const id = dailyMapId(key, pool.map((m) => m.id));
  return pool.find((m) => m.id === id);
}

/** Historial: solo los días con tiempo, con su medalla. */
export function dailyMedals(
  keys: readonly string[],
  maps: readonly RaceMap[],
  bestOf: (key: string) => number | null,
): DailyMedal[] {
  const out: DailyMedal[] = [];
  for (const key of keys) {
    const best = bestOf(key);
    const map = dailyMapOf(key, maps);
    const targets = map && mapMedalTargets(map);
    if (best === null || !map || !targets) continue;
    out.push({ key, map, targets, best, medal: medalFor(best, targets) });
  }
  return out;
}

/** Cuántas de cada (tener oro cuenta también como plata y bronce, como en Race Time). */
export function medalCounts(days: readonly DailyMedal[]): Record<Medal, number> {
  const c: Record<Medal, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const d of days) {
    if (!d.medal) continue;
    for (const m of MEDALS.slice(0, MEDALS.indexOf(d.medal) + 1)) c[m]++;
  }
  return c;
}
