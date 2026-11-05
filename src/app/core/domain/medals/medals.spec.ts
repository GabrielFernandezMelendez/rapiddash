import { describe, expect, it } from 'vitest';
import { CIRCUIT_MAPS, EXPERIMENTAL_MAPS } from '../track/race-map';
import { mapMedalTargets } from './map-medals';
import { leagueProgress, medalFor, medalTargets, nextMedal } from './medals';

describe('medallas por tiempo', () => {
  const t = medalTargets(50);

  it('platino −3 %, oro = piloto automático, plata +8 %, bronce +18 %', () => {
    expect(t).toEqual({ platinum: 48.5, gold: 50, silver: 54, bronze: 59 });
  });

  it('la medalla es la mejor que da el tiempo', () => {
    expect(medalFor(null, t)).toBeNull();
    expect(medalFor(60, t)).toBeNull();
    expect(medalFor(59, t)).toBe('bronze');
    expect(medalFor(53.9, t)).toBe('silver');
    expect(medalFor(50, t)).toBe('gold');
    expect(medalFor(48, t)).toBe('platinum');
  });

  it('la siguiente medalla y cuánto falta dentro de la liga', () => {
    expect(nextMedal(null)).toBe('bronze');
    expect(nextMedal('gold')).toBe('platinum');
    expect(nextMedal('platinum')).toBeNull();
    expect(leagueProgress(54, t)).toBe(0);
    expect(leagueProgress(52, t)).toBeCloseTo(0.5, 6);
    expect(leagueProgress(48, t)).toBe(1);
  });

  it('cada circuito tiene tiempos ordenados; los de prueba, ninguno', () => {
    for (const map of CIRCUIT_MAPS) {
      const m = mapMedalTargets(map)!;
      expect(m.platinum).toBeLessThan(m.gold);
      expect(m.gold).toBeLessThan(m.silver);
      expect(m.silver).toBeLessThan(m.bronze);
      expect(m.gold).toBeGreaterThan(30);
    }
    for (const map of EXPERIMENTAL_MAPS) expect(mapMedalTargets(map)).toBeNull();
  });
});
