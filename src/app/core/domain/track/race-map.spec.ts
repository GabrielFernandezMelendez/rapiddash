import { RACE_MAPS } from './race-map';
import { TRACK_HALF_WIDTH } from './track-constants';
import { Track } from './track';

describe('RACE_MAPS', () => {
  it('hay tres mapas con identificador único', () => {
    expect(RACE_MAPS.length).toBe(3);
    expect(new Set(RACE_MAPS.map((m) => m.id)).size).toBe(3);
  });

  for (const map of RACE_MAPS) {
    it(`${map.id}: la pista no se cruza consigo misma`, () => {
      const track = Track.fromSegments(map.segments);
      const pts = track.samples.filter((_, i) => i % 4 === 0);
      // Dos tramos que no son vecinos en la pista deben estar a más de dos anchos de distancia
      const minGap = TRACK_HALF_WIDTH * 2 + 3;
      const neighbourWindow = 60; // metros de pista que se consideran "el mismo tramo"
      const step = track.length / (track.samples.length - 1);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          if ((j - i) * 4 * step < neighbourWindow) continue;
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
          expect(d, `${map.id} se cruza en ${i * 4 * step}m / ${j * 4 * step}m`).toBeGreaterThan(
            minGap,
          );
        }
      }
    });
  }
});
