import { describe, expect, it } from 'vitest';
import { dailyKey } from '../daily/daily-map';
import { ALL_MAPS } from '../track/race-map';
import { dailyMapOf, dailyMedals, medalCounts, recentDayKeys } from './daily-medals';

describe('historial de medallas del mapa del día', () => {
  it('días hacia atrás desde hoy, cruzando meses', () => {
    expect(recentDayKeys('2026-11-02', 4)).toEqual(['2026-11-02', '2026-11-01', '2026-10-31', '2026-10-30']);
  });

  it('cada día, el circuito que tocó en el mapa del día', () => {
    const key = dailyKey(new Date('2026-11-05T12:00:00Z'));
    expect(dailyMapOf(key, ALL_MAPS)?.layout).toBe('laps');
    expect(dailyMapOf(key, ALL_MAPS)?.experimental).toBeFalsy();
  });

  it('solo los días con tiempo, con su medalla; el oro cuenta también como plata y bronce', () => {
    const keys = recentDayKeys('2026-11-05', 3);
    const map0 = dailyMapOf(keys[0], ALL_MAPS)!;
    const days = dailyMedals(keys, ALL_MAPS, (k) => (k === keys[1] ? null : k === keys[0] ? 1 : 999));
    expect(days.map((d) => d.key)).toEqual([keys[0], keys[2]]);
    expect(days[0].map.id).toBe(map0.id);
    expect(days[0].medal).toBe('platinum');
    expect(days[1].medal).toBeNull();
    expect(medalCounts(days)).toEqual({ bronze: 1, silver: 1, gold: 1, platinum: 1 });
  });
});
