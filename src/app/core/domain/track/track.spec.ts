import { JUNCTION_SIZE, START_DISTANCE, START_LINE, TRACK_HALF_WIDTH } from './track-constants';
import { left, narrow, right, straight, widen } from './track-segment';
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

  describe('embudos', () => {
    const track = Track.fromSegments([
      straight(20),
      narrow(10),
      straight(20),
      right(),
      straight(10),
      widen(6),
      straight(10),
    ]);

    it('el ancho pasa de 5 a 3 carriles a lo largo del embudo', () => {
      expect(track.halfWidthAt(0, 10)).toBeCloseTo(5.5);
      expect(track.halfWidthAt(0, 25)).toBeCloseTo(4.4);
      expect(track.halfWidthAt(0, 40)).toBeCloseTo(3.3);
      const [taper] = track.legs[0].tapers;
      expect(track.legs[0].tapers.length).toBe(1);
      expect(taper.start).toBeCloseTo(20);
      expect(taper.end).toBeCloseTo(30);
      expect(taper.fromHalfWidth).toBeCloseTo(5.5);
      expect(taper.toHalfWidth).toBeCloseTo(3.3);
    });

    it('el cruce de un tramo estrecho es más pequeño y el tramo siguiente sale de su centro', () => {
      expect(track.legs[0].junction!.halfWidth).toBeCloseTo(3.3);
      expect(track.halfWidthAt(0, 52)).toBeCloseTo(3.3);
      const start = track.pointAt(1, 0);
      expect(start.x).toBeCloseTo(3.3);
      expect(start.z).toBeCloseTo(-50 - 3.3);
      expect(track.halfWidthAt(1, 0)).toBeCloseTo(3.3);
    });

    it('el ensanche vuelve a 5 carriles', () => {
      expect(track.halfWidthAt(1, 13)).toBeCloseTo(4.4);
      expect(track.halfWidthAt(1, 20)).toBeCloseTo(5.5);
    });
  });
});

describe('Track.circuit', () => {
  // Rectángulo de 4 derechas que acaba en la recta de salida
  const lap = [straight(30), right(), straight(40), right(), straight(50), right(), straight(40), right(), straight(20)];
  const circuit = Track.circuit(lap, 3);
  const single = circuit.circuit!.lapTrack;

  it('mide la vuelta y pone la meta en la línea de salida tras 3 vueltas', () => {
    const lapLength = single.legs.reduce((sum, l) => sum + l.length, 0);
    expect(circuit.circuit!.lapLength).toBeCloseTo(lapLength);
    expect(circuit.finishProgress).toBeCloseTo(START_LINE + 3 * lapLength);
  });

  it('cada vuelta pasa exactamente por los mismos sitios', () => {
    const n = single.legs.length;
    // El tramo 1 de cada vuelta (tras el primer cruce) está en el mismo sitio
    const a = circuit.pointAt(1, 10);
    const b = circuit.pointAt(1 + (n - 1), 10);
    const c = circuit.pointAt(1 + 2 * (n - 1), 10);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(c.z).toBeCloseTo(a.z, 6);
    // Con el rumbo sumando una vuelta entera, para que la cámara no gire de golpe
    expect(b.heading - a.heading).toBeCloseTo(2 * Math.PI, 6);
  });

  it('une la última recta con la primera sin saltos', () => {
    const joined = circuit.legs[single.legs.length - 1];
    for (let i = 1; i < joined.samples.length; i++) {
      const p = joined.samples[i - 1];
      const q = joined.samples[i];
      expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeLessThan(0.6);
    }
  });

  it('cuenta las vueltas por el progreso', () => {
    const L = circuit.circuit!.lapLength;
    expect(circuit.lapAt(START_DISTANCE)).toBe(1);
    expect(circuit.lapAt(START_LINE + L - 1)).toBe(1);
    expect(circuit.lapAt(START_LINE + L + 1)).toBe(2);
    expect(circuit.lapAt(START_LINE + 2 * L + 1)).toBe(3);
    expect(circuit.lapAt(START_LINE + 5 * L)).toBe(3);
  });

  it('una pista de ida siempre va por la vuelta 1', () => {
    expect(Track.fromSegments([straight(100)]).lapAt(80)).toBe(1);
  });
});
