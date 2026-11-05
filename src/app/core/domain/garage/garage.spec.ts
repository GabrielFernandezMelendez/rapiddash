import { describe, expect, it } from 'vitest';
import {
  DEBUG_TAPS,
  debugTap,
  DEFAULT_GARAGE,
  isCarUnlocked,
  isFxUnlocked,
  lockedCars,
  lockedFx,
  lockedPrizes,
  parsePrize,
  pickPrize,
  prizeKey,
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

describe('premios del cubo del día', () => {
  it('un coche ganado queda abierto sin debug y se puede llevar', () => {
    expect(isCarUnlocked(14, false, [14])).toBe(true);
    expect(isCarUnlocked(15, false, [14])).toBe(false);
    expect(usableGarage({ car: 14, fx: 1 }, false, [14])).toEqual({ car: 14, fx: 1 });
  });

  it('un efecto ganado queda abierto sin debug y se puede llevar', () => {
    expect(isFxUnlocked(3, false, [3])).toBe(true);
    expect(isFxUnlocked(4, false, [3])).toBe(false);
    expect(usableGarage({ car: null, fx: 3 }, false, [], [3])).toEqual({ car: null, fx: 3 });
    expect(usableGarage({ car: null, fx: 4 }, false, [], [3])).toEqual(DEFAULT_GARAGE);
  });

  it('el premio es un coche o un efecto de los cerrados, al azar, y nunca repite', () => {
    expect(lockedCars([])).toHaveLength(19);
    expect(lockedFx([])).toHaveLength(9);
    expect(lockedPrizes([], [])).toHaveLength(28);
    expect(lockedCars([2, 3])).not.toContain(2);
    expect(pickPrize([], [], () => 0)).toEqual({ kind: 'car', id: 2 });
    expect(pickPrize([], [], () => 0.999)).toEqual({ kind: 'fx', id: 10 });
    expect(pickPrize([2], [], () => 0)).toEqual({ kind: 'car', id: 3 });
    expect(pickPrize([], [2, 3], () => 0.999)).toEqual({ kind: 'fx', id: 10 });
  });

  it('con coches y efectos ganados no hay premio; con solo los coches, sí', () => {
    const cars = Array.from({ length: 19 }, (_, i) => i + 2);
    const fx = Array.from({ length: 9 }, (_, i) => i + 2);
    expect(pickPrize(cars, [], () => 0)).toEqual({ kind: 'fx', id: 2 });
    expect(lockedPrizes(cars, fx)).toEqual([]);
    expect(pickPrize(cars, fx)).toBeNull();
  });

  it('el premio viaja por la URL y lo que no existe se descarta', () => {
    expect(parsePrize(prizeKey({ kind: 'car', id: 14 }))).toEqual({ kind: 'car', id: 14 });
    expect(parsePrize('fx-3')).toEqual({ kind: 'fx', id: 3 });
    for (const bad of ['car-21', 'fx-0', 'fx-11', 'moto-3', 'car-', '', null, undefined]) {
      expect(parsePrize(bad)).toBeNull();
    }
  });
});
