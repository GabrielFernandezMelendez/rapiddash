import { describe, expect, it } from 'vitest';
import { CIRCUIT_MAPS, EXPERIMENTAL_MAPS, trackOf } from './race-map';
import { buildTerrain, roadHeight } from './terrain';

const hilly = CIRCUIT_MAPS.filter((m) => m.terrain);

describe('relieve de los circuitos entre colinas', () => {
  it('hay tres circuitos con relieve', () => {
    expect(hilly.length).toBe(3);
  });

  it('la carretera cierra en la salida y nunca baja del llano', () => {
    const spec = { amplitude: 6, seed: 2 };
    expect(roadHeight(0, 300, spec)).toBeCloseTo(roadHeight(300, 300, spec), 6);
    for (let p = 0; p < 300; p += 3) expect(roadHeight(p, 300, spec)).toBeGreaterThanOrEqual(0);
  });

  it('la montaña rusa cierra en la salida y es mucho más empinada (30-40 m)', () => {
    const coaster = EXPERIMENTAL_MAPS.find((m) => m.id === 'summit-gp-coaster')!;
    const lap = trackOf(coaster).circuit!.lapTrack;
    const length = lap.legs.reduce((sum, l) => sum + l.length, 0);
    const spec = coaster.terrain!;
    expect(roadHeight(0, length, spec)).toBeCloseTo(roadHeight(length, length, spec), 6);
    let lo = Infinity;
    let hi = -Infinity;
    let steepest = 0;
    for (let p = 0; p < length; p += 2) {
      const h = roadHeight(p, length, spec);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      steepest = Math.max(steepest, Math.abs(roadHeight(p + 2, length, spec) - h) / 2);
    }
    expect(hi - lo).toBeGreaterThan(28);
    expect(hi - lo).toBeLessThanOrEqual(40);
    // Más del triple que las colinas, pero sin paredes
    expect(steepest).toBeGreaterThan(0.2);
    expect(steepest).toBeLessThan(0.6);
  });

  it('planeta y tubo: mundo curvado sin relieve en la carretera', () => {
    const curved = EXPERIMENTAL_MAPS.filter((m) => m.terrain?.curve);
    expect(curved.map((m) => m.terrain!.curve!.kind)).toEqual(['planet', 'tube']);
    for (const m of curved) expect(m.terrain!.amplitude).toBe(0);
  });

  for (const map of hilly) {
    it(`${map.id}: sube y baja sin pendientes ni peraltes raros, y lejos es llano`, () => {
      const lap = trackOf(map).circuit!.lapTrack;
      const terrain = buildTerrain(lap, map.terrain!);
      let lo = Infinity;
      let hi = -Infinity;
      for (const leg of lap.legs) {
        for (let d = 2; d < leg.length - 2; d += 2) {
          const c = lap.pointAt(leg.index, d);
          const n = lap.pointAt(leg.index, d + 2);
          const h = terrain.height(c.x, c.z);
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
          // Pendiente por debajo del 25 %
          expect(Math.abs(terrain.height(n.x, n.z) - h) / 2, map.id).toBeLessThan(0.25);
          // De lado (de muro a muro) casi plana
          const left = lap.worldAt(leg.index, d, -5);
          const right = lap.worldAt(leg.index, d, 5);
          expect(
            Math.abs(terrain.height(left.x, left.z) - terrain.height(right.x, right.z)),
            map.id,
          ).toBeLessThan(0.6);
        }
      }
      // Desnivel de verdad en la carretera
      expect(hi - lo, map.id).toBeGreaterThan(3);
      // Lejos de la pista, llano (ahí van los carteles con la foto)
      const s = lap.pointAt(0, 0);
      expect(terrain.height(s.x + 900, s.z + 900)).toBe(0);
    });
  }
});
