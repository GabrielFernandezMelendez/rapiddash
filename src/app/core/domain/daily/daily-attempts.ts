/**
 * Intentos del mapa del día. Cada día hay 2 gratis; al gastarlos se puede ver un anuncio
 * (3 intentos más) o esperar 3 h (2 gratis más). Un intento se gasta al empezar la carrera.
 */
export const FREE_ATTEMPTS = 2;
export const AD_ATTEMPTS = 3;
export const WAIT_MS = 3 * 60 * 60 * 1000;

export interface DailyAttempts {
  readonly day: string;
  readonly used: number;
  readonly allowed: number;
  /** Cuándo se gastó el último intento disponible (empieza la espera de 3 h). */
  readonly exhaustedAt: number | null;
}

export function freshAttempts(day: string): DailyAttempts {
  return { day, used: 0, allowed: FREE_ATTEMPTS, exhaustedAt: null };
}

/** Estado al día de hoy: un día nuevo empieza de cero y una espera cumplida da 2 intentos. */
export function currentAttempts(saved: DailyAttempts | null, day: string, now: number): DailyAttempts {
  if (!saved || saved.day !== day) return freshAttempts(day);
  if (saved.exhaustedAt !== null && now - saved.exhaustedAt >= WAIT_MS) {
    return { ...saved, allowed: saved.allowed + FREE_ATTEMPTS, exhaustedAt: null };
  }
  return saved;
}

export function canRace(state: DailyAttempts): boolean {
  return state.used < state.allowed;
}

/** Empieza una carrera: gasta un intento (y si era el último, arranca la espera). */
export function useAttempt(state: DailyAttempts, now: number): DailyAttempts {
  if (!canRace(state)) return state;
  const used = state.used + 1;
  return { ...state, used, exhaustedAt: used >= state.allowed ? now : null };
}

/** Anuncio visto: 3 intentos más al momento. */
export function grantAdAttempts(state: DailyAttempts): DailyAttempts {
  return { ...state, allowed: Math.max(state.allowed, state.used) + AD_ATTEMPTS, exhaustedAt: null };
}

/** Lo que falta para que la espera dé intentos (0 si se puede correr). */
export function waitRemaining(state: DailyAttempts, now: number): number {
  if (canRace(state) || state.exhaustedAt === null) return 0;
  return Math.max(0, state.exhaustedAt + WAIT_MS - now);
}
