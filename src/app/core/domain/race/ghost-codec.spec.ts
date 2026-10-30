import { GhostFrame } from './ghost';
import { decodeGhost, encodeGhost } from './ghost-codec';

const lap = (seconds: number): GhostFrame[] =>
  Array.from({ length: seconds * 20 }, (_, i) => {
    const t = i / 20;
    return {
      time: t,
      progress: t * 21.3456,
      leg: Math.floor(t / 6),
      distance: (t % 6) * 21.3456,
      lateral: Math.sin(t) * 3.17,
      yaw: Math.cos(t) * 0.7853,
    };
  });

describe('Fantasma comprimido', () => {
  it('ida y vuelta con precisión de centímetros y milirradianes', () => {
    const frames = lap(5);
    const back = decodeGhost(encodeGhost(frames))!;
    expect(back.length).toBe(frames.length);
    back.forEach((f, i) => {
      const o = frames[i];
      expect(f.leg).toBe(o.leg);
      expect(Math.abs(f.time - o.time)).toBeLessThan(0.002);
      expect(Math.abs(f.progress - o.progress)).toBeLessThan(0.01);
      expect(Math.abs(f.distance - o.distance)).toBeLessThan(0.006);
      expect(Math.abs(f.lateral - o.lateral)).toBeLessThan(0.006);
      expect(Math.abs(f.yaw - o.yaw)).toBeLessThan(0.0006);
    });
  });

  it('el progreso nunca decrece tras comprimir', () => {
    const back = decodeGhost(encodeGhost(lap(10)))!;
    for (let i = 1; i < back.length; i++) {
      expect(back[i].progress).toBeGreaterThanOrEqual(back[i - 1].progress);
    }
  });

  it('una vuelta de 90 s cabe de sobra en un documento', () => {
    expect(encodeGhost(lap(90)).length).toBeLessThan(120_000);
  });

  it('rechaza datos rotos o de otra versión', () => {
    expect(decodeGhost('9|1,2,3,4,5,6')).toBeNull();
    expect(decodeGhost('1|1,2,3')).toBeNull();
    expect(decodeGhost('1|a,b,c,d,e,f')).toBeNull();
    expect(decodeGhost('')).toBeNull();
  });
});
