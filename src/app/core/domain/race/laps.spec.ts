import { right, straight } from '../track/track-segment';
import { Track } from '../track/track';
import { bestLapIndex, ghostLapTime, lapBanner } from './laps';

const track = Track.circuit([straight(60), right(), straight(30), right(), straight(60), right(), straight(30), right(), straight(30)], 3);
const L = track.circuit!.lapLength;
// Fantasma a velocidad constante: 20 m/s desde la salida
const ghostAt = (progress: number) => (progress - track.startDistance) / 20;

describe('vueltas', () => {
  it('tiempo del fantasma en cada vuelta', () => {
    expect(ghostLapTime(track, 1, ghostAt)).toBeCloseTo((track.lapStartProgress(2) - track.startDistance) / 20);
    expect(ghostLapTime(track, 2, ghostAt)).toBeCloseTo(L / 20);
    expect(ghostLapTime(track, 2, () => null)).toBeNull();
  });

  it('cartel de la vuelta 2 y de la última, con la diferencia con el fantasma', () => {
    const lap1 = ghostLapTime(track, 1, ghostAt)!;
    const two = lapBanner(track, [lap1 - 0.3], 10, ghostAt)!;
    expect(two.kind).toBe('lap');
    expect(two.lap).toBe(2);
    expect(two.delta).toBeCloseTo(-0.3);
    const last = lapBanner(track, [lap1, L / 20 + 0.12], 20, ghostAt)!;
    expect(last.kind).toBe('last');
    expect(last.delta).toBeCloseTo(0.12);
    // Tras la 3.ª vuelta no hay cartel de vuelta (es la meta)
    expect(lapBanner(track, [1, 2, 3], 30, ghostAt)).toBeNull();
    // Sin fantasma, sin diferencia
    expect(lapBanner(track, [lap1], 10, null)!.delta).toBeNull();
  });

  it('la mejor vuelta', () => {
    expect(bestLapIndex([15.8, 13.4, 14.8])).toBe(1);
    expect(bestLapIndex([])).toBe(-1);
  });
});
