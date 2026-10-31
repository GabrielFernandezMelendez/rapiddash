/**
 * Mapa del día: el mismo para todos, cambia a medianoche de España. De momento rota entre los
 * mapas que hay.
 */
export const DAILY_TIME_ZONE = 'Europe/Madrid';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Día en la zona del juego: «2026-10-31». */
export function dailyKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DAILY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Ranking de un día: se guarda como un mapa más («daily-2026-10-31»). */
export function dailyBoardId(key: string): string {
  return `daily-${key}`;
}

export function isDailyBoard(boardId: string): boolean {
  return boardId.startsWith('daily-');
}

/** Día desde el que los circuitos entran en la rotación (antes, el mapa de cada día no cambia). */
export const CIRCUITS_IN_DAILY_FROM = '2026-11-02';

/** Mapas que rotan ese día: los circuitos se suman a partir de CIRCUITS_IN_DAILY_FROM. */
export function dailyPool<M extends { readonly id: string; readonly layout: string }>(
  key: string,
  maps: readonly M[],
): readonly M[] {
  return key < CIRCUITS_IN_DAILY_FROM ? maps.filter((m) => m.layout !== 'laps') : maps;
}

/** Mapa que toca ese día: rota por orden, un mapa distinto cada día. */
export function dailyMapId(key: string, mapIds: readonly string[]): string {
  const days = Math.floor(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)) / DAY_MS);
  return mapIds[((days % mapIds.length) + mapIds.length) % mapIds.length];
}

/** Milisegundos hasta el próximo mapa (medianoche en España). */
export function msUntilNextDay(now: Date): number {
  const today = dailyKey(now);
  // Avanza por horas hasta que cambie el día (sirve con horario de verano)
  let probe = now.getTime() - (now.getTime() % 60000);
  while (dailyKey(new Date(probe)) === today) probe += 60 * 60 * 1000;
  // Ajuste fino al minuto
  let back = probe;
  while (dailyKey(new Date(back - 60000)) !== today) back -= 60000;
  return Math.max(0, back - now.getTime());
}

/** Copa según el puesto: el primer tercio, oro; el segundo, plata; el resto, bronce. */
export type Trophy = 'gold' | 'silver' | 'bronze';

export function trophyFor(rank: number, total: number): Trophy {
  // Pilotos por delante entre el total: el 1.º siempre es oro, aunque juegue solo
  const share = (rank - 1) / Math.max(total, rank, 1);
  if (share < 1 / 3) return 'gold';
  if (share < 2 / 3) return 'silver';
  return 'bronze';
}
