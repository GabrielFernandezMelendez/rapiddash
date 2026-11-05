/**
 * Garaje: el coche y el efecto al acelerar que lleva el jugador.
 *
 * Los coches sustituyen al deportivo retro de serie; el efecto acompaña a cualquiera.
 * Se abren los de serie, los ganados con el cubo azul del mapa del día y, con el modo debug, todos.
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

/** Lo que lleva el jugador. `car: null` = el deportivo de serie. */
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

export function isFxUnlocked(fx: number, debug: boolean, won: readonly number[] = []): boolean {
  return GARAGE_FX.some((f) => f.id === fx) && (debug || STARTER_FX.has(fx) || won.includes(fx));
}

/** Efectos que aún se pueden ganar (sin contar el debug). */
export function lockedFx(won: readonly number[]): number[] {
  return GARAGE_FX.map((f) => f.id).filter((id) => !isFxUnlocked(id, false, won));
}

/** Lo que regala el cubo azul: un coche o un efecto al acelerar. */
export interface Prize {
  readonly kind: 'car' | 'fx';
  readonly id: number;
}

/** Todo lo que aún se puede ganar, coches primero. */
export function lockedPrizes(wonCars: readonly number[], wonFx: readonly number[]): Prize[] {
  return [
    ...lockedCars(wonCars).map((id): Prize => ({ kind: 'car', id })),
    ...lockedFx(wonFx).map((id): Prize => ({ kind: 'fx', id })),
  ];
}

/** Premio del cubo: un coche o efecto cerrado al azar (null si ya están todos). */
export function pickPrize(
  wonCars: readonly number[],
  wonFx: readonly number[] = [],
  random: () => number = Math.random,
): Prize | null {
  const locked = lockedPrizes(wonCars, wonFx);
  if (!locked.length) return null;
  return locked[Math.min(locked.length - 1, Math.floor(random() * locked.length))];
}

/** El premio en texto, para pasarlo por la URL del garaje: «car-14», «fx-3». */
export function prizeKey(prize: Prize): string {
  return `${prize.kind}-${prize.id}`;
}

/** Lo contrario de `prizeKey`: null si no es un coche o efecto que exista. */
export function parsePrize(key: string | null | undefined): Prize | null {
  const match = /^(car|fx)-(\d+)$/.exec(key ?? '');
  if (!match) return null;
  const id = Number(match[2]);
  const kind = match[1] as Prize['kind'];
  const exists = (kind === 'car' ? GARAGE_CARS : GARAGE_FX).some((item) => item.id === id);
  return exists ? { kind, id } : null;
}

/**
 * Lo guardado, ya comprobado: lo que no existe o está cerrado (por ejemplo, al quitar el debug)
 * vuelve a lo de serie.
 */
export function usableGarage(
  stored: unknown,
  debug: boolean,
  won: readonly number[] = [],
  wonFx: readonly number[] = [],
): GarageChoice {
  const raw = (stored ?? {}) as { car?: unknown; fx?: unknown };
  const car = typeof raw.car === 'number' && isCarUnlocked(raw.car, debug, won) ? raw.car : null;
  const fx = typeof raw.fx === 'number' && isFxUnlocked(raw.fx, debug, wonFx) ? raw.fx : CLASSIC_EXHAUST;
  return { car, fx };
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
