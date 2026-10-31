import {
  JoinResult,
  TournamentRepository,
} from '../../core/application/ports/out/tournament.repository';
import { Tournament, TournamentMember } from '../../core/domain/tournament/tournament';
import type { FirestoreTournamentRepository } from './firestore-tournament.repository';

/** Torneos; Firestore se descarga la primera vez que hace falta. */
export class LazyTournamentRepository extends TournamentRepository {
  private repo: Promise<FirestoreTournamentRepository> | null = null;

  private load(): Promise<FirestoreTournamentRepository> {
    this.repo ??= import('./firestore-tournament.repository').then(
      (m) => new m.FirestoreTournamentRepository(),
    );
    this.repo.catch(() => (this.repo = null));
    return this.repo;
  }

  async create(t: Tournament): Promise<'created' | 'taken'> {
    return (await this.load()).create(t);
  }
  async get(code: string): Promise<Tournament | null> {
    return (await this.load()).get(code);
  }
  async mine(uid: string): Promise<Tournament[]> {
    return (await this.load()).mine(uid);
  }
  async join(code: string, member: TournamentMember): Promise<JoinResult> {
    return (await this.load()).join(code, member);
  }
  async start(code: string, mapIds: readonly string[]): Promise<void> {
    return (await this.load()).start(code, mapIds);
  }
}
