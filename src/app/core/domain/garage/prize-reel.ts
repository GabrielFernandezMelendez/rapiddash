import { GARAGE_CARS, GARAGE_FX, Prize } from './garage';
import { carLook, fxAccent } from './car-looks';

/** Posición del premio en la cinta de la ruleta. */
export const PRIZE_REEL_WINNER = 28;
/** Premios detrás del ganador: se ven asomando cuando la cinta se detiene. */
const PRIZES_AFTER = 4;
/** Con menos opciones que estas la cinta se ve repetitiva: se rellena con todos los premios. */
const MIN_POOL = 4;

/** Duración del giro y del rebote final (ms). */
export const REEL_SPIN_MS = 3200;
export const REEL_SETTLE_MS = 450;
/** Cuánto se pasa la cinta del premio antes de volver (en premios). */
const REEL_OVERSHOOT = 0.36;

/** Los coches 1-10 son el mismo modelo pintado de otro color: comparten silueta. */
function sameShape(a: Prize, b: Prize): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'car') return carLook(a.id).profile === carLook(b.id).profile;
  return a.id === b.id;
}

const samePrize = (a: Prize, b: Prize) => a.kind === b.kind && a.id === b.id;

/** Todos los premios posibles (lo que no viene abierto de serie). */
function allPrizes(): Prize[] {
  return [
    ...GARAGE_CARS.filter((c) => c.id !== 1).map((c): Prize => ({ kind: 'car', id: c.id })),
    ...GARAGE_FX.filter((f) => f.id !== 1).map((f): Prize => ({ kind: 'fx', id: f.id })),
  ];
}

/**
 * La cinta de la ruleta: lo que aún se podía ganar, con el premio en `PRIZE_REEL_WINNER`. Evita dos
 * siluetas iguales seguidas. El premio ya está decidido: la cinta solo lo cuenta.
 */
export function prizeReel(
  prize: Prize,
  locked: readonly Prize[],
  random: () => number = Math.random,
): Prize[] {
  const pool = locked.length >= MIN_POOL ? locked : allPrizes();
  const reel: Prize[] = [];
  for (let i = 0; i <= PRIZE_REEL_WINNER + PRIZES_AFTER; i++) {
    if (i === PRIZE_REEL_WINNER) {
      reel.push(prize);
      continue;
    }
    const prev = reel[i - 1];
    const fits = pool.filter(
      (p) =>
        !(prev && sameShape(p, prev)) &&
        // El de justo antes del premio tampoco puede parecérsele
        !(i === PRIZE_REEL_WINNER - 1 && (sameShape(p, prize) || samePrize(p, prize))),
    );
    const options = fits.length ? fits : pool;
    reel.push(options[Math.min(options.length - 1, Math.floor(random() * options.length))]);
  }
  return reel;
}

/**
 * Posición de la cinta (en premios) a los `ms` de empezar: sale rápido, frena, se pasa un poco del
 * premio y vuelve con un rebote, como el muelle de los carriles.
 */
export function reelPosition(ms: number): number {
  if (ms >= REEL_SPIN_MS + REEL_SETTLE_MS) return PRIZE_REEL_WINNER;
  if (ms < REEL_SPIN_MS) {
    const left = 1 - Math.max(0, ms) / REEL_SPIN_MS;
    return (PRIZE_REEL_WINNER + REEL_OVERSHOOT) * (1 - left ** 4);
  }
  const s = (ms - REEL_SPIN_MS) / 1000;
  return PRIZE_REEL_WINNER + REEL_OVERSHOOT * Math.exp(-5 * s) * Math.cos(9 * s);
}

/** Color del premio para los rayos y el brillo del nombre. */
export function prizeAccent(prize: Prize): string {
  return prize.kind === 'car' ? carLook(prize.id).accent : fxAccent(prize.id);
}
