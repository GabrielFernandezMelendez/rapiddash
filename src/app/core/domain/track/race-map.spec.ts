import { ALL_MAPS, ZIGZAG_MAPS } from './race-map';
import { SAMPLE_STEP, TRACK_HALF_WIDTH } from './track-constants';
import { Track } from './track';

describe('ALL_MAPS', () => {
  it('hay seis mapas (3 clásicos y 3 zigzag) con identificador único', () => {
    expect(ALL_MAPS.length).toBe(6);
    expect(new Set(ALL_MAPS.map((m) => m.id)).size).toBe(6);
  });

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
      const track = Track.fromSegments(map.segments);
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
          if (pts[j].progress - pts[i].progress < neighbourWindow) continue;
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
