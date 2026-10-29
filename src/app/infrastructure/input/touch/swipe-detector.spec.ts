import { SwipeDetector, SWIPE_THRESHOLD } from './swipe-detector';

describe('SwipeDetector', () => {
  it('no emite nada por debajo del umbral', () => {
    const d = new SwipeDetector();
    d.down(100, 100);
    expect(d.move(100 + SWIPE_THRESHOLD - 5, 100)).toBeNull();
  });

  it('detecta derecha, izquierda y adelante', () => {
    const d = new SwipeDetector();
    d.down(100, 100);
    expect(d.move(140, 100)).toBe('right');
    expect(d.move(90, 100)).toBe('left');
    expect(d.move(90, 50)).toBe('forward');
  });

  it('encadena lado y adelante en el mismo gesto', () => {
    const d = new SwipeDetector();
    d.down(0, 0);
    const swipes = [d.move(40, 0), d.move(40, -40)];
    expect(swipes).toEqual(['right', 'forward']);
  });

  it('ignora el movimiento hacia abajo y sin dedo pulsado', () => {
    const d = new SwipeDetector();
    expect(d.move(50, 0)).toBeNull();
    d.down(0, 0);
    expect(d.move(0, 60)).toBeNull();
  });
});
