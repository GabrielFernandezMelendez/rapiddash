import { GarageChoice } from '../garage/garage';
import { TournamentMember } from '../tournament/tournament';

/**
 * 1 vs 1 Turbo Race: uno crea el duelo y comparte un código, entra el rival y cada uno tiene 3
 * intentos en el mismo circuito. Gana el mejor tiempo. Los códigos son como los de los torneos.
 */
export const DUEL_ATTEMPTS = 3;
/** Tiempo para jugarlo desde que entra el rival: si alguien desaparece, el duelo no se queda abierto. */
export const DUEL_WINDOW_MS = 24 * 60 * 60 * 1000;
/**
 * Con el último intento gastado se da por terminado a un piloto aunque no avise (se le cerró la
 * app, por ejemplo). Es más de lo que dura cualquier carrera. Debe esperar a que acabe la carrera:
 * el intento se gasta al salir, no al llegar.
 */
export const DUEL_RACE_GRACE_MS = 5 * 60 * 1000;

export interface DuelPlayer {
  readonly attempts: number;
  /** Hora del servidor del último intento (null si aún no ha corrido). */
  readonly lastStartAt: number | null;
  /** Avisó de que ya ha terminado su último intento. */
  readonly done: boolean;
  /** Coche y efecto con los que corrió por última vez: los de la pantalla de victoria. */
  readonly car: GarageChoice['car'];
  readonly fx: GarageChoice['fx'];
}

export interface Duel {
  /** El código es también su identificador. */
  readonly code: string;
  readonly ownerUid: string;
  readonly members: readonly TournamentMember[];
  readonly players: Readonly<Record<string, DuelPlayer>>;
  /** Hora del servidor a la que entró el rival (null mientras se le espera). */
  readonly startedAt: number | null;
  readonly mapId: string;
}

export type DuelStatus = 'waiting' | 'running' | 'finished';

/** Ranking del duelo: un tablero más («d-K7RQ2M»). */
export function duelBoardId(code: string): string {
  return `d-${code}`;
}

export function newDuelPlayer(garage: GarageChoice): DuelPlayer {
  return { attempts: 0, lastStartAt: null, done: false, car: garage.car, fx: garage.fx };
}

export function pickDuelMap(mapIds: readonly string[], random: () => number = Math.random): string {
  return mapIds[Math.min(mapIds.length - 1, Math.floor(random() * mapIds.length))];
}

/** Ha gastado todo y ya no puede cambiar su tiempo. */
function playerFinished(player: DuelPlayer | undefined, now: number): boolean {
  if (!player || player.attempts < DUEL_ATTEMPTS) return false;
  return player.done || (player.lastStartAt !== null && now >= player.lastStartAt + DUEL_RACE_GRACE_MS);
}

export function duelStatus(d: Duel, now: number): DuelStatus {
  if (d.startedAt === null) return 'waiting';
  if (now >= d.startedAt + DUEL_WINDOW_MS) return 'finished';
  return d.members.every((m) => playerFinished(d.players[m.uid], now)) ? 'finished' : 'running';
}

/** Lo que le queda al plazo del duelo. */
export function duelRemaining(d: Duel, now: number): number {
  return d.startedAt === null ? 0 : Math.max(0, d.startedAt + DUEL_WINDOW_MS - now);
}

export function attemptsLeft(d: Duel, uid: string): number {
  return Math.max(0, DUEL_ATTEMPTS - (d.players[uid]?.attempts ?? 0));
}

export function isDuelMember(d: Duel, uid: string): boolean {
  return d.members.some((m) => m.uid === uid);
}

/** Puedo empezar un intento: el duelo sigue abierto, estoy dentro y me queda alguno. */
export function canRaceDuel(d: Duel, uid: string, now: number): boolean {
  return isDuelMember(d, uid) && duelStatus(d, now) === 'running' && attemptsLeft(d, uid) > 0;
}

/** Su rival en el duelo (null si aún no ha entrado). */
export function rivalOf(d: Duel, uid: string): TournamentMember | null {
  return d.members.find((m) => m.uid !== uid) ?? null;
}

export type DuelJoinProblem = 'already' | 'full';

export function duelJoinProblem(d: Duel, uid: string): DuelJoinProblem | null {
  if (isDuelMember(d, uid)) return 'already';
  return d.members.length >= 2 ? 'full' : null;
}

/** Mejor tiempo de un piloto en el duelo. */
export interface DuelScore {
  readonly uid: string;
  readonly time: number;
}

export type DuelOutcome =
  | { readonly kind: 'winner'; readonly uid: string }
  | { readonly kind: 'draw' }
  /** Nadie hizo un tiempo. */
  | { readonly kind: 'none' };

/** Gana el mejor tiempo de los miembros; si solo corrió uno, gana él. */
export function duelOutcome(d: Duel, scores: readonly DuelScore[]): DuelOutcome {
  const ranked = scores.filter((s) => isDuelMember(d, s.uid)).sort((a, b) => a.time - b.time);
  if (!ranked.length) return { kind: 'none' };
  if (ranked[1] && ranked[1].time === ranked[0].time) return { kind: 'draw' };
  return { kind: 'winner', uid: ranked[0].uid };
}
