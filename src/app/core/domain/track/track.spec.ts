import { CORNER_RADIUS } from './track-constants';
import { left, right, straight } from './track-segment';
import { Track } from './track';

describe('Track', () => {
  it('una recta avanza hacia -z con rumbo 0', () => {
    const track = Track.fromSegments([straight(10)]);
    const end = track.pointAt(track.length);
    expect(track.length).toBeCloseTo(10);
    expect(end.x).toBeCloseTo(0);
    expect(end.z).toBeCloseTo(-10);
    expect(end.heading).toBeCloseTo(0);
  });

  it('una curva a la derecha deja el rumbo en +90° y desplaza el radio', () => {
    const track = Track.fromSegments([right()]);
    const end = track.pointAt(track.length);
    expect(end.heading).toBeCloseTo(Math.PI / 2);
    // El muestreo redondea la longitud del arco: tolerancia de medio metro
    expect(end.x).toBeCloseTo(CORNER_RADIUS, 0);
    expect(end.z).toBeCloseTo(-CORNER_RADIUS, 0);
  });

  it('registra las curvas de 90° con su sentido', () => {
    const track = Track.fromSegments([straight(20), left(), straight(10), right()]);
    expect(track.corners.map((c) => c.direction)).toEqual([-1, 1]);
    expect(track.corners[0].start).toBeCloseTo(20);
  });

  it('cornerNear detecta la curva dentro de la ventana previa', () => {
    const track = Track.fromSegments([straight(20), right(), straight(10)]);
    expect(track.cornerNear(5, 9)).toBeUndefined();
    expect(track.cornerNear(12, 9)?.index).toBe(0);
  });

  it('worldAt desplaza a la derecha del sentido de marcha', () => {
    const track = Track.fromSegments([straight(10)]);
    const p = track.worldAt(5, 2);
    expect(p.x).toBeCloseTo(2);
  });
});
