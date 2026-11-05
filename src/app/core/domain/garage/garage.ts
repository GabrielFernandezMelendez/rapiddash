/**
 * Garaje: el coche y el efecto al acelerar que lleva el jugador.
 *
 * Los coches son synthwave: se usan en las estéticas retro y futurista (sustituyen al deportivo y
 * a la nave). En clásico sigue el coche de siempre. El efecto vale en las tres.
 * Hasta que haya forma de ganarlos, solo están abiertos los de serie; el modo debug lo abre todo.
 */

export type CarGroup = 'retro' | 'new';

export interface GarageCar {
  readonly id: number;
  readonly group: CarGroup;
}

export interface GarageFx {
  readonly id: number;
}

/** 1-10: el deportivo retro con otra pintura; 11-20: modelos nuevos. */
export const GARAGE_CARS: readonly GarageCar[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  group: i < 10 ? 'retro' : 'new',
}));

/** 1 es el escape de siempre (brasas); 2-10, los nuevos. */
export const GARAGE_FX: readonly GarageFx[] = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));

export const CLASSIC_EXHAUST = 1;

/** Lo que lleva el jugador. `car: null` = el vehículo de serie de la estética. */
export interface GarageChoice {
  readonly car: number | null;
  readonly fx: number;
}

export const DEFAULT_GARAGE: GarageChoice = { car: null, fx: CLASSIC_EXHAUST };

/** Abiertos sin debug: el Morado Synthwave (el deportivo retro de siempre) y el escape clásico. */
const STARTER_CARS: ReadonlySet<number> = new Set([1]);
const STARTER_FX: ReadonlySet<number> = new Set([CLASSIC_EXHAUST]);

/** Abiertos sin debug: los de serie y los ganados con el cubo del mapa del día (`won`). */
export function isCarUnlocked(
  car: number | null,
  debug: boolean,
  won: readonly number[] = [],
): boolean {
  if (car === null) return true;
  return (
    GARAGE_CARS.some((c) => c.id === car) && (debug || STARTER_CARS.has(car) || won.includes(car))
  );
}

/** Coches que aún se pueden ganar (sin contar el debug). */
export function lockedCars(won: readonly number[]): number[] {
  return GARAGE_CARS.map((c) => c.id).filter((id) => !isCarUnlocked(id, false, won));
}

/** Coche que regala el cubo: uno cerrado al azar (null si ya están todos). */
export function pickPrize(won: readonly number[], random: () => number = Math.random): number | null {
  const locked = lockedCars(won);
  if (!locked.length) return null;
  return locked[Math.min(locked.length - 1, Math.floor(random() * locked.length))];
}

export function isFxUnlocked(fx: number, debug: boolean): boolean {
  return GARAGE_FX.some((f) => f.id === fx) && (debug || STARTER_FX.has(fx));
}

/**
 * Lo guardado, ya comprobado: lo que no existe o está cerrado (por ejemplo, al quitar el debug)
 * vuelve a lo de serie.
 */
export function usableGarage(
  stored: unknown,
  debug: boolean,
  won: readonly number[] = [],
): GarageChoice {
  const raw = (stored ?? {}) as { car?: unknown; fx?: unknown };
  const car = typeof raw.car === 'number' && isCarUnlocked(raw.car, debug, won) ? raw.car : null;
  const fx = typeof raw.fx === 'number' && isFxUnlocked(raw.fx, debug) ? raw.fx : CLASSIC_EXHAUST;
  return { car, fx };
}

/** ¿Lleva coche del garaje en esta estética? (en clásico, nunca). */
export function garageCarFor(choice: GarageChoice, aesthetic: string): number | null {
  return aesthetic === 'classic' ? null : choice.car;
}

/** Toques seguidos en la versión (en Ajustes) que activan el modo debug. */
export const DEBUG_TAPS = 7;
/** Si pasa más que esto entre dos toques, se empieza a contar de nuevo. */
export const DEBUG_TAP_WINDOW_MS = 1500;

/** Cuenta de toques para el debug: devuelve la cuenta nueva y si ya se ha llegado. */
export function debugTap(
  state: { count: number; last: number },
  now: number,
): { count: number; last: number; unlocked: boolean } {
  const count = now - state.last <= DEBUG_TAP_WINDOW_MS ? state.count + 1 : 1;
  return count >= DEBUG_TAPS
    ? { count: 0, last: now, unlocked: true }
    : { count, last: now, unlocked: false };
}
