import { ALL_MAPS, CIRCUIT_MAPS, trackOf, ZIGZAG_MAPS } from './race-map';
import { SAMPLE_STEP, TRACK_HALF_WIDTH } from './track-constants';
import { Track } from './track';

describe('ALL_MAPS', () => {
  it('hay 15 mapas (3 clásicos, 3 zigzag y 9 circuitos) con identificador único', () => {
    expect(ALL_MAPS.length).toBe(15);
    expect(CIRCUIT_MAPS.length).toBe(9);
    expect(new Set(ALL_MAPS.map((m) => m.id)).size).toBe(15);
  });

  for (const map of CIRCUIT_MAPS) {
    it(`${map.id}: el circuito cierra (vuelve a la salida con el mismo rumbo)`, () => {
      const legs = Track.fromSegments(map.segments).legs;
      const last = legs[legs.length - 1];
      const end = last.samples[last.samples.length - 1];
      // Solo el redondeo de las muestras (se corrige al unir la última recta con la primera)
      expect(Math.hypot(end.x, end.z)).toBeLessThan(0.5);
      expect(end.heading).toBeCloseTo(2 * Math.PI, 6);
      expect(last.junction).toBeNull();
    });
  }

  it('las series zigzag tienen entre 3 y 8 cruces seguidos', () => {
    const longest = ZIGZAG_MAPS.map((m) => {
      let run = 0;
      let best = 0;
      let prevWasCorner = false;
      for (const seg of m.segments) {
        if (seg.kind === 'corner') {
          run = prevWasCorner ? run + 1 : 1;
          best = Math.max(best, run);
          prevWasCorner = true;
        } else if (seg.kind === 'straight' && seg.length <= 16) {
          // Un tramo corto entre cruces no rompe la serie
        } else {
          prevWasCorner = false;
          run = 0;
        }
      }
      return best;
    });
    expect(longest).toEqual([4, 5, 8]);
  });

  for (const map of ALL_MAPS) {
    it(`${map.id}: la pista no se cruza consigo misma`, () => {
      const raceTrack = trackOf(map);
      const track = raceTrack.circuit?.lapTrack ?? raceTrack;
      const lap = raceTrack.circuit?.lapLength ?? Infinity;
      // Puntos del eje de cada tramo con su progreso; los cruces se cubren con su centro
      const pts = track.legs.flatMap((leg) =>
        leg.samples
          .filter((_, i) => i % 4 === 0)
          .map((p, i) => ({ x: p.x, z: p.z, progress: leg.startProgress + i * 4 * SAMPLE_STEP })),
      );
      // Dos zonas que no son vecinas en la pista deben estar a más de dos anchos de distancia
      const minGap = TRACK_HALF_WIDTH * 2 + 3;
      const neighbourWindow = 60;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          // En un circuito el final de la vuelta es vecino de la salida
          const apart = pts[j].progress - pts[i].progress;
          if (Math.min(apart, lap - apart) < neighbourWindow) continue;
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
          expect(
            d,
            `${map.id} se cruza en ${pts[i].progress}m / ${pts[j].progress}m`,
          ).toBeGreaterThan(minGap);
        }
      }
    });
  }
});
