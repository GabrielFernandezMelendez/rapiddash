import { TournamentPhotoRepository } from '../../core/application/ports/out/tournament-photo.repository';
import type { FirestoreTournamentPhotoRepository } from './firestore-tournament-photo.repository';

/** Fotos del cartel del líder; Firestore se descarga la primera vez que hace falta. */
export class LazyTournamentPhotoRepository extends TournamentPhotoRepository {
  private repo: Promise<FirestoreTournamentPhotoRepository> | null = null;

  private load(): Promise<FirestoreTournamentPhotoRepository> {
    this.repo ??= import('./firestore-tournament-photo.repository').then(
      (m) => new m.FirestoreTournamentPhotoRepository(),
    );
    this.repo.catch(() => (this.repo = null));
    return this.repo;
  }

  async get(code: string, uid: string): Promise<string | null> {
    return (await this.load()).get(code, uid);
  }
  async save(code: string, uid: string, dataUrl: string): Promise<void> {
    return (await this.load()).save(code, uid, dataUrl);
  }
  async remove(code: string, uid: string): Promise<void> {
    return (await this.load()).remove(code, uid);
  }
}
