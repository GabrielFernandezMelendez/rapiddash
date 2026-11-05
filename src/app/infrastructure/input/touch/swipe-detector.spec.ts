import {
  Gesture,
  RESTART_SWIPE_MS,
  RESTART_SWIPE_PX,
  SwipeDetector,
  SWIPE_REST_MS,
  SWIPE_THRESHOLD,
} from './swipe-detector';

/** Desliza hasta (x, y) en pasos de 16 ms y devuelve los gestos que salen. */
function slide(
  d: SwipeDetector,
  x: number,
  y: number,
  ms: number,
  from = { x: 0, y: 0, t: 0 },
): Gesture[] {
  const steps = Math.max(1, Math.round(ms / 16));
  const gestures: Gesture[] = [];
  for (let i = 1; i <= steps; i++) {
    const g = d.move(
      from.x + ((x - from.x) * i) / steps,
      from.y + ((y - from.y) * i) / steps,
      from.t + (ms * i) / steps,
    );
    if (g) gestures.push(g);
  }
  return gestures;
}

describe('SwipeDetector', () => {
  it('no emite nada por debajo del umbral', () => {
    const d = new SwipeDetector();
    d.down(100, 100);
    expect(d.move(100 + SWIPE_THRESHOLD - 5, 100, 0)).toBeNull();
  });

  it('detecta derecha e izquierda', () => {
    const d = new SwipeDetector();
    d.down(100, 100);
    expect(d.move(140, 100, 0)).toBe('right');
    d.up();
    d.down(100, 100);
    expect(d.move(60, 100, 0)).toBe('left');
  });

  it('un deslizamiento largo cuenta como un solo swipe', () => {
    const d = new SwipeDetector();
    d.down(0, 0);
    const swipes = [];
    for (let i = 1; i <= 20; i++) swipes.push(d.move(i * 15, 0, i * 16));
    expect(swipes.filter((s) => s !== null)).toEqual(['right']);
  });

  it('sin levantar el dedo, tras pararse un instante se puede hacer otro swipe', () => {
    const d = new SwipeDetector();
    d.down(0, 0);
    expect(d.move(40, 0, 0)).toBe('right');
    expect(d.move(80, 0, 16)).toBeNull();
    expect(d.move(120, 0, 16 + SWIPE_REST_MS)).toBe('right');
  });

  it('levantar el dedo también permite otro swipe', () => {
    const d = new SwipeDetector();
    d.down(0, 0);
    expect(d.move(40, 0, 0)).toBe('right');
    d.up();
    d.down(40, 0);
    expect(d.move(0, 0, 10)).toBe('left');
  });

  it('ignora el movimiento vertical y sin dedo pulsado', () => {
    const d = new SwipeDetector();
    expect(d.move(50, 0, 0)).toBeNull();
    d.down(0, 0);
    expect(d.move(0, 60, 0)).toBeNull();
    expect(d.move(0, -60, 0)).toBeNull();
  });

  describe('swipe de reinicio', () => {
    it('un swipe largo y rápido hacia abajo pide reiniciar una sola vez', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 0, RESTART_SWIPE_PX * 2, 300)).toEqual(['restart']);
    });

    it('un swipe corto hacia abajo no hace nada', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 0, RESTART_SWIPE_PX - 10, 200)).toEqual([]);
    });

    it('un dedo que resbala despacio no reinicia', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 0, RESTART_SWIPE_PX * 2, RESTART_SWIPE_MS * 4)).toEqual([]);
    });

    it('hacia arriba no reinicia', () => {
      const d = new SwipeDetector();
      d.down(0, 400);
      expect(slide(d, 0, 0, 200, { x: 0, y: 400, t: 0 })).toEqual([]);
    });

    it('una diagonal abierta cambia de carril y no reinicia', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 300, 200, 200)).toEqual(['right']);
    });

    it('funciona tras mantener el dedo quieto acelerando', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 0, RESTART_SWIPE_PX + 20, 250, { x: 0, y: 0, t: 5000 })).toEqual(['restart']);
    });

    it('con el dedo temblando tras mucho rato acelerando, funciona en cualquier momento', () => {
      // Un dedo pulsado nunca está quieto del todo: se probaron todos los instantes posibles
      for (let delay = 0; delay < RESTART_SWIPE_MS; delay += 20) {
        const d = new SwipeDetector();
        d.down(0, 0);
        let t = 0;
        for (; t < 60_000 + delay; t += 16) expect(d.move(t % 32 ? 1 : 0, t % 48 ? 1 : 0, t)).toBeNull();
        const from = { x: 0, y: 0, t };
        expect(slide(d, 0, RESTART_SWIPE_PX + 20, 250, from), `a ${delay} ms`).toEqual(['restart']);
      }
    });

    it('con el mismo dedo se puede reiniciar otra vez, sin levantarlo', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 0, RESTART_SWIPE_PX + 20, 200)).toEqual(['restart']);
      // Vuelve a subir el dedo (despacio, acelerando) y unas vueltas después repite
      const y = RESTART_SWIPE_PX + 20;
      expect(slide(d, 0, 0, 2000, { x: 0, y, t: 200 })).toEqual([]);
      expect(slide(d, 0, RESTART_SWIPE_PX + 20, 200, { x: 0, y: 0, t: 30_000 })).toEqual(['restart']);
    });

    it('tras cambiar de carril se puede reiniciar sin levantar el dedo', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 60, 0, 60)).toEqual(['right']);
      const from = { x: 60, y: 0, t: 1000 };
      expect(slide(d, 60, RESTART_SWIPE_PX + 20, 250, from)).toEqual(['restart']);
    });

    it('un swipe lento con un tramo final rápido cuenta por el tramo rápido', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 0, 40, 400)).toEqual([]);
      const from = { x: 0, y: 40, t: 400 };
      expect(slide(d, 0, 40 + RESTART_SWIPE_PX + 10, 200, from)).toEqual(['restart']);
    });

    it('al poner el dedo otra vez se puede volver a reiniciar', () => {
      const d = new SwipeDetector();
      d.down(0, 0);
      expect(slide(d, 0, RESTART_SWIPE_PX + 20, 200)).toEqual(['restart']);
      d.up();
      d.down(0, 0);
      expect(slide(d, 0, RESTART_SWIPE_PX + 20, 200, { x: 0, y: 0, t: 1000 })).toEqual(['restart']);
    });
  });
});
