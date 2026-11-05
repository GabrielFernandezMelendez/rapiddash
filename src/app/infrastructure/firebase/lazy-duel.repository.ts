import { DuelJoinResult, DuelRepository } from '../../core/application/ports/out/duel.repository';
import { Duel } from '../../core/domain/duel/duel';
import { GarageChoice } from '../../core/domain/garage/garage';
import { TournamentMember } from '../../core/domain/tournament/tournament';
import type { FirestoreDuelRepository } from './firestore-duel.repository';

/** Duelos; Firestore se descarga la primera vez que hace falta. */
export class LazyDuelRepository extends DuelRepository {
  private repo: Promise<FirestoreDuelRepository> | null = null;

  private load(): Promise<FirestoreDuelRepository> {
    this.repo ??= import('./firestore-duel.repository').then((m) => new m.FirestoreDuelRepository());
    this.repo.catch(() => (this.repo = null));
    return this.repo;
  }

  async create(duel: Duel): Promise<'created' | 'taken'> {
    return (await this.load()).create(duel);
  }
  async get(code: string): Promise<Duel | null> {
    return (await this.load()).get(code);
  }
  async mine(uid: string): Promise<Duel[]> {
    return (await this.load()).mine(uid);
  }
  async join(code: string, member: TournamentMember, garage: GarageChoice): Promise<DuelJoinResult> {
    return (await this.load()).join(code, member, garage);
  }
  async startAttempt(code: string, uid: string, garage: GarageChoice): Promise<boolean> {
    return (await this.load()).startAttempt(code, uid, garage);
  }
  async markDone(code: string, uid: string): Promise<void> {
    return (await this.load()).markDone(code, uid);
  }
  async remove(code: string): Promise<void> {
    return (await this.load()).remove(code);
  }
}
