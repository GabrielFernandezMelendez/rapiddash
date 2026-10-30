import { SwipeDetector, SWIPE_REST_MS, SWIPE_THRESHOLD } from './swipe-detector';

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
});
