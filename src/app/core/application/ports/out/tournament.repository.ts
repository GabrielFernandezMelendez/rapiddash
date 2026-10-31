import { JoinProblem, Tournament, TournamentMember } from '../../../domain/tournament/tournament';

export type JoinResult = 'joined' | 'not-found' | JoinProblem;

/** Torneos en la nube. El código es el identificador. */
export abstract class TournamentRepository {
  /** Crea el torneo; 'taken' si ya existe uno con ese código (se reintenta con otro). */
  abstract create(t: Tournament): Promise<'created' | 'taken'>;
  abstract get(code: string): Promise<Tournament | null>;
  /** Torneos en los que estoy. */
  abstract mine(uid: string): Promise<Tournament[]>;
  /** Se une comprobando a la vez que no haya empezado ni esté lleno. */
  abstract join(code: string, member: TournamentMember): Promise<JoinResult>;
  /** Solo el creador: cierra la entrada y fija los mapas; la hora la pone el servidor. */
  abstract start(code: string, mapIds: readonly string[]): Promise<void>;
}
