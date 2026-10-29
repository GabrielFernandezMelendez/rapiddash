import { JUNCTION_SIZE, TRACK_HALF_WIDTH } from './track-constants';
import { left, right, straight } from './track-segment';
import { Track } from './track';

describe('Track', () => {
  it('una recta avanza hacia -z con rumbo 0', () => {
    const track = Track.fromSegments([straight(10)]);
    const end = track.pointAt(0, 10);
    expect(track.legs[0].length).toBeCloseTo(10);
    expect(end.x).toBeCloseTo(0);
    expect(end.z).toBeCloseTo(-10);
    expect(end.heading).toBeCloseTo(0);
  });

  it('cada curva de 90° separa dos tramos con un cruce cuadrado', () => {
    const track = Track.fromSegments([straight(20), right(), straight(10), left(), straight(30)]);
    expect(track.legs.length).toBe(3);
    expect(track.legs.map((l) => l.junction?.direction ?? null)).toEqual([1, -1, null]);
  });

  it('el tramo siguiente sale del centro del lado abierto del cruce, girado 90°', () => {
    const track = Track.fromSegments([straight(20), right(), straight(10)]);
    const start = track.pointAt(1, 0);
    expect(start.heading).toBeCloseTo(Math.PI / 2);
    expect(start.x).toBeCloseTo(TRACK_HALF_WIDTH);
    expect(start.z).toBeCloseTo(-20 - TRACK_HALF_WIDTH);
  });

  it('worldAt sitúa puntos dentro del cruce con el rumbo de entrada', () => {
    const track = Track.fromSegments([straight(20), left(), straight(10)]);
    const p = track.worldAt(0, 20 + JUNCTION_SIZE / 2, 0);
    expect(p.heading).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(-20 - JUNCTION_SIZE / 2);
  });

  it('el progreso crece por los tramos y se detiene en el cruce', () => {
    const track = Track.fromSegments([straight(20), right(), straight(30)]);
    expect(track.progress(0, 25)).toBeCloseTo(20);
    expect(track.progress(1, 5)).toBeCloseTo(25);
    expect(track.finishProgress).toBeCloseTo(50 - 24);
  });

  it('worldAt desplaza a la derecha del sentido de marcha', () => {
    const track = Track.fromSegments([straight(10)]);
    expect(track.worldAt(0, 5, 2).x).toBeCloseTo(2);
  });
});
