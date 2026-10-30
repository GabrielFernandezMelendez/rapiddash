import { SwipeDetector, SWIPE_THRESHOLD } from './swipe-detector';

describe('SwipeDetector', () => {
  it('no emite nada por debajo del umbral', () => {
    const d = new SwipeDetector();
    d.down(100, 100);
    expect(d.move(100 + SWIPE_THRESHOLD - 5, 100)).toBeNull();
  });

  it('detecta derecha e izquierda', () => {
    const d = new SwipeDetector();
    d.down(100, 100);
    expect(d.move(140, 100)).toBe('right');
    expect(d.move(90, 100)).toBe('left');
  });

  it('encadena varios cambios de carril en el mismo gesto', () => {
    const d = new SwipeDetector();
    d.down(0, 0);
    const swipes = [d.move(40, 0), d.move(80, 0)];
    expect(swipes).toEqual(['right', 'right']);
  });

  it('ignora el movimiento vertical y sin dedo pulsado', () => {
    const d = new SwipeDetector();
    expect(d.move(50, 0)).toBeNull();
    d.down(0, 0);
    expect(d.move(0, 60)).toBeNull();
    expect(d.move(0, -60)).toBeNull();
  });
});
