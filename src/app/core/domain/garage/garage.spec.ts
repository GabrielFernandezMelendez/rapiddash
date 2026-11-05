import { describe, expect, it } from 'vitest';
import {
  DEBUG_TAPS,
  debugTap,
  DEFAULT_GARAGE,
  isCarUnlocked,
  isFxUnlocked,
  lockedCars,
  pickPrize,
  usableGarage,
} from './garage';

describe('garaje', () => {
  it('sin debug solo están abiertos el de serie, el Morado Synthwave y el escape clásico', () => {
    expect(isCarUnlocked(null, false)).toBe(true);
    expect(isCarUnlocked(1, false)).toBe(true);
    expect(isCarUnlocked(11, false)).toBe(false);
    expect(isFxUnlocked(1, false)).toBe(true);
    expect(isFxUnlocked(3, false)).toBe(false);
  });

  it('el debug abre los 20 coches y los 10 efectos, pero no lo que no existe', () => {
    expect(isCarUnlocked(20, true)).toBe(true);
    expect(isCarUnlocked(21, true)).toBe(false);
    expect(isFxUnlocked(10, true)).toBe(true);
    expect(isFxUnlocked(0, true)).toBe(false);
  });

  it('lo guardado que está cerrado o roto vuelve a lo de serie', () => {
    expect(usableGarage({ car: 14, fx: 5 }, true)).toEqual({ car: 14, fx: 5 });
    // Al quitar el debug
    expect(usableGarage({ car: 14, fx: 5 }, false)).toEqual(DEFAULT_GARAGE);
    expect(usableGarage('basura', false)).toEqual(DEFAULT_GARAGE);
    expect(usableGarage(null, true)).toEqual(DEFAULT_GARAGE);
  });

  it('el debug se activa con 7 toques seguidos; una pausa larga vuelve a empezar', () => {
    let state = { count: 0, last: -Infinity };
    for (let i = 1; i < DEBUG_TAPS; i++) {
      const next = debugTap(state, i * 300);
      expect(next.unlocked).toBe(false);
      state = next;
    }
    expect(debugTap(state, DEBUG_TAPS * 300).unlocked).toBe(true);
    // Con una pausa de 2 s la cuenta vuelve a 1
    expect(debugTap(state, DEBUG_TAPS * 300 + 2000)).toMatchObject({ count: 1, unlocked: false });
  });
});

describe('coches ganados con el cubo del día', () => {
  it('un coche ganado queda abierto sin debug y se puede llevar', () => {
    expect(isCarUnlocked(14, false, [14])).toBe(true);
    expect(isCarUnlocked(15, false, [14])).toBe(false);
    expect(usableGarage({ car: 14, fx: 1 }, false, [14])).toEqual({ car: 14, fx: 1 });
  });

  it('el premio es uno de los cerrados, al azar, y nunca repite', () => {
    expect(lockedCars([])).toHaveLength(19);
    expect(lockedCars([2, 3])).not.toContain(2);
    expect(pickPrize([], () => 0)).toBe(2);
    expect(pickPrize([], () => 0.999)).toBe(20);
    expect(pickPrize([2], () => 0)).toBe(3);
  });

  it('con todos ganados no hay premio', () => {
    const all = Array.from({ length: 19 }, (_, i) => i + 2);
    expect(lockedCars(all)).toEqual([]);
    expect(pickPrize(all)).toBeNull();
  });
});
