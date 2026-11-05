import { Duel, DuelJoinProblem } from '../../../domain/duel/duel';
import { GarageChoice } from '../../../domain/garage/garage';
import { TournamentMember } from '../../../domain/tournament/tournament';

export type DuelJoinResult = 'joined' | 'not-found' | DuelJoinProblem;

/** Duelos 1 vs 1 en la nube. El código es el identificador. */
export abstract class DuelRepository {
  /** Crea el duelo; 'taken' si ya existe uno con ese código (se reintenta con otro). */
  abstract create(duel: Duel): Promise<'created' | 'taken'>;
  abstract get(code: string): Promise<Duel | null>;
  /** Duelos en los que estoy. */
  abstract mine(uid: string): Promise<Duel[]>;
  /** Entra el rival y empieza el plazo; la hora la pone el servidor. */
  abstract join(code: string, member: TournamentMember, garage: GarageChoice): Promise<DuelJoinResult>;
  /** Gasta un intento comprobando a la vez que queda alguno; false si no se puede. */
  abstract startAttempt(code: string, uid: string, garage: GarageChoice): Promise<boolean>;
  /** Avisa de que el piloto ya ha terminado su último intento. */
  abstract markDone(code: string, uid: string): Promise<void>;
  /** Cancelar mientras se espera al rival: solo el creador. */
  abstract remove(code: string): Promise<void>;
}
