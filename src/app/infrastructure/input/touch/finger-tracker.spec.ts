import { FingerTracker } from './finger-tracker';
import { SWIPE_THRESHOLD } from './swipe-detector';

describe('FingerTracker', () => {
  it('con un dedo se acelera y se hacen swipes como siempre', () => {
    const f = new FingerTracker();
    f.down(1, 100, 100);
    expect(f.pressing).toBe(true);
    expect(f.move(1, 100 + SWIPE_THRESHOLD + 5, 100, 0)).toBe('right');
    f.up(1);
    expect(f.pressing).toBe(false);
  });

  it('con dos dedos, uno acelera quieto y el otro hace los swipes', () => {
    const f = new FingerTracker();
    f.down(1, 50, 600);
    f.down(2, 300, 400);
    expect(f.move(2, 300 - SWIPE_THRESHOLD - 5, 400, 0)).toBe('left');
    // Levantar el dedo de los swipes no deja de acelerar
    f.up(2);
    expect(f.pressing).toBe(true);
    f.up(1);
    expect(f.pressing).toBe(false);
  });

  it('el dedo que acelera tampoco pierde sus swipes', () => {
    const f = new FingerTracker();
    f.down(1, 50, 600);
    f.down(2, 300, 400);
    expect(f.move(1, 50 + SWIPE_THRESHOLD + 5, 600, 0)).toBe('right');
  });

  it('un tercer dedo se ignora', () => {
    const f = new FingerTracker();
    f.down(1, 0, 0);
    f.down(2, 0, 0);
    expect(f.down(3, 0, 0)).toBe(false);
    expect(f.move(3, 200, 0, 0)).toBeNull();
  });
});
