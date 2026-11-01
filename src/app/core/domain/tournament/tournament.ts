import { CountryCode } from '../profile/country';

/** Torneos: ligas de 3 días entre amigos, hasta 20 pilotos, un mapa al azar cada día. Se entra en cualquier momento con el enlace. */
export const TOURNAMENT_MAX_MEMBERS = 20;
export const TOURNAMENT_DAYS = 3;
export const TOURNAMENT_DAY_MS = 24 * 60 * 60 * 1000;
/** Puntos por puesto cada día (como en Mario Kart); del 11.º en adelante, 0. */
export const DAY_POINTS = [15, 12, 10, 8, 7, 6, 5, 4, 3, 2] as const;

/** Código de 6 caracteres sin los que se confunden (0/O, 1/I/L). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;

export const NAME_MAX = 24;

export interface TournamentMember {
  readonly uid: string;
  readonly nickname: string;
  readonly country: CountryCode | null;
}

export interface Tournament {
  /** El código es también su identificador. */
  readonly code: string;
  readonly name: string;
  readonly ownerUid: string;
  readonly members: readonly TournamentMember[];
  /** null mientras se espera a que el creador lo empiece. */
  readonly startedAt: number | null;
  /** Los 3 mapas, sorteados al empezar. */
  readonly mapIds: readonly string[];
}

export type TournamentStatus = 'waiting' | 'running' | 'finished';

export function generateCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length) % CODE_ALPHABET.length];
  }
  return code;
}

/** Lo que escribe el jugador («k7rq 2m») pasado a código; null si no puede serlo. */
export function normalizeCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CODE_LENGTH) return null;
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
}

/**
 * Tres mapas distintos al azar. Con `circuitIds`, uno de los tres es siempre un circuito por
 * vueltas (en un día al azar) y los otros dos, mapas de ida.
 */
export function pickMaps(
  mapIds: readonly string[],
  random: () => number = Math.random,
  circuitIds: readonly string[] = [],
): string[] {
  const take = (pool: string[]) => pool.splice(Math.floor(random() * pool.length) % pool.length, 1)[0];
  const circuits = mapIds.filter((id) => circuitIds.includes(id));
  const pool = circuits.length ? mapIds.filter((id) => !circuitIds.includes(id)) : [...mapIds];
  const picked: string[] = [];
  while (picked.length < TOURNAMENT_DAYS - (circuits.length ? 1 : 0) && pool.length) picked.push(take(pool));
  if (circuits.length) picked.splice(Math.floor(random() * (picked.length + 1)) % (picked.length + 1), 0, take(circuits));
  return picked;
}

/** Día en curso (0, 1 o 2); 3 si ya ha terminado; null si no ha empezado. */
export function dayIndex(t: Tournament, now: number): number | null {
  if (t.startedAt === null) return null;
  return Math.min(TOURNAMENT_DAYS, Math.max(0, Math.floor((now - t.startedAt) / TOURNAMENT_DAY_MS)));
}

export function statusAt(t: Tournament, now: number): TournamentStatus {
  const day = dayIndex(t, now);
  if (day === null) return 'waiting';
  return day >= TOURNAMENT_DAYS ? 'finished' : 'running';
}

/** Lo que le queda al día en curso. */
export function dayRemaining(t: Tournament, now: number): number {
  const day = dayIndex(t, now);
  if (day === null || day >= TOURNAMENT_DAYS || t.startedAt === null) return 0;
  return t.startedAt + (day + 1) * TOURNAMENT_DAY_MS - now;
}

/** Ranking de cada día: un tablero más («t-K7RQ2M-d0»). */
export function dayBoardId(code: string, day: number): string {
  return `t-${code}-d${day}`;
}

export function isMember(t: Tournament, uid: string): boolean {
  return t.members.some((m) => m.uid === uid);
}

export type JoinProblem = 'finished' | 'full' | 'already';

/** Se puede entrar en cualquier momento con el enlace, también ya empezado, salvo si ha terminado o está lleno. */
export function joinProblem(t: Tournament, uid: string, now: number = Date.now()): JoinProblem | null {
  if (isMember(t, uid)) return 'already';
  if (statusAt(t, now) === 'finished') return 'finished';
  if (t.members.length >= TOURNAMENT_MAX_MEMBERS) return 'full';
  return null;
}

export function pointsFor(rank: number): number {
  return DAY_POINTS[rank - 1] ?? 0;
}

/** Mejor tiempo de un piloto en un día. */
export interface DayTime {
  readonly uid: string;
  readonly time: number;
}

export interface StandingRow {
  readonly member: TournamentMember;
  /** Puntos de cada día; null si ese día aún no ha llegado o no corrió. */
  readonly days: readonly (number | null)[];
  /** Mejor tiempo de cada día (s); null si ese día no corrió. */
  readonly times: readonly (number | null)[];
  readonly total: number;
  /** Días ganados (desempate). */
  readonly wins: number;
}

/**
 * Clasificación: en cada día, puntos según el puesto entre los miembros (solo cuentan los
 * miembros; quien no corre suma 0). Orden: puntos, días ganados y apodo.
 */
export function standings(t: Tournament, dayTimes: readonly (readonly DayTime[])[]): StandingRow[] {
  const members = new Set(t.members.map((m) => m.uid));
  const perDay = dayTimes.map((times) => {
    const ranked = times
      .filter((d) => members.has(d.uid))
      .sort((a, b) => a.time - b.time)
      .map((d) => d.uid);
    return new Map(ranked.map((uid, i) => [uid, pointsFor(i + 1)]));
  });
  const rows = t.members.map((member) => {
    const days = perDay.map((points) => points.get(member.uid) ?? null);
    const times = dayTimes.map((list) => bestOf(list, member.uid));
    const winsList = dayTimes.map((times) => winnerOf(times, members) === member.uid);
    return {
      member,
      days,
      times,
      total: days.reduce<number>((sum, p) => sum + (p ?? 0), 0),
      wins: winsList.filter(Boolean).length,
    };
  });
  return rows.sort(
    (a, b) => b.total - a.total || b.wins - a.wins || a.member.nickname.localeCompare(b.member.nickname),
  );
}

/** Mejor tiempo de un piloto en la lista de un día; null si no corrió. */
function bestOf(times: readonly DayTime[], uid: string): number | null {
  const mine = times.filter((d) => d.uid === uid).map((d) => d.time);
  return mine.length ? Math.min(...mine) : null;
}

/** Ganador de un día (el más rápido entre los miembros); null si nadie corrió. */
export function winnerOf(times: readonly DayTime[], members: ReadonlySet<string>): string | null {
  const best = times.filter((d) => members.has(d.uid)).sort((a, b) => a.time - b.time)[0];
  return best?.uid ?? null;
}
