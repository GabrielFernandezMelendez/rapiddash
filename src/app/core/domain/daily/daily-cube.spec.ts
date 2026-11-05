import { describe, expect, it } from 'vitest';
import { CIRCUIT_MAPS, trackOf } from '../track/race-map';
import { LANE_WIDTH } from '../track/track-constants';
import { dailyCube, touchesCube } from './daily-cube';

describe('cubo azul del mapa del día', () => {
  const map = CIRCUIT_MAPS[0];
  const track = trackOf(map);
  const lap = track.circuit!.lapTrack;

  it('el mismo día sale en el mismo sitio para todos; otro día, en otro', () => {
    expect(dailyCube('2026-11-07', lap)).toEqual(dailyCube('2026-11-07', lap));
    const days = ['2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'].map((k) => dailyCube(k, lap));
    expect(new Set(days.map((c) => `${c.progress}:${c.lateral}`)).size).toBeGreaterThan(1);
  });

  for (const m of CIRCUIT_MAPS) {
    it(`${m.id}: siempre en el centro de un carril, dentro de la pista y lejos de la salida`, () => {
      const circuit = trackOf(m).circuit!;
      const l = circuit.lapTrack;
      for (let day = 1; day <= 30; day++) {
        const cube = dailyCube(`2026-12-${String(day).padStart(2, '0')}`, l);
        expect(cube.progress).toBeGreaterThanOrEqual(40);
        expect(cube.progress).toBeLessThan(circuit.lapLength);
        const leg = l.legs.find((g) => cube.progress >= g.startProgress && cube.progress < g.startProgress + g.length)!;
        const hw = l.halfWidthAt(leg.index, cube.progress - leg.startProgress);
        expect(Math.abs(cube.lateral)).toBeLessThan(hw);
        // Centro de carril: a medio carril de un borde
        const fromWall = (cube.lateral + hw) / LANE_WIDTH - 0.5;
        expect(fromWall).toBeCloseTo(Math.round(fromWall), 6);
      }
    });
  }

  it('se coge pasando por su carril, en cualquier vuelta; en el de al lado, no', () => {
    const cube = dailyCube('2026-11-07', lap);
    const lapLength = track.circuit!.lapLength;
    expect(touchesCube(cube, cube.progress, cube.lateral, lapLength)).toBe(true);
    expect(touchesCube(cube, cube.progress + 2 * lapLength + 1, cube.lateral + 0.5, lapLength)).toBe(true);
    expect(touchesCube(cube, cube.progress, cube.lateral + LANE_WIDTH, lapLength)).toBe(false);
    expect(touchesCube(cube, cube.progress + 5, cube.lateral, lapLength)).toBe(false);
  });
});
