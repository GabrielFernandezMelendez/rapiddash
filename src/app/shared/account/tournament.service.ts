import { inject, Injectable } from '@angular/core';
import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import { TournamentPhotoRepository } from '../../core/application/ports/out/tournament-photo.repository';
import { isValidPhoto } from '../../core/domain/tournament/leader-photo';
import { JoinResult, TournamentRepository } from '../../core/application/ports/out/tournament.repository';
import { TournamentBoard, Tournaments } from '../../core/application/use-cases/tournaments';
import { Tournament } from '../../core/domain/tournament/tournament';
import { AccountService } from './account.service';

/** Torneos para las pantallas, con el piloto de la sesión. */
@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly account = inject(AccountService);
  private readonly photos = inject(TournamentPhotoRepository);
  private readonly settings = inject(SettingsRepository);
  private readonly tournaments = new Tournaments(
    inject(TournamentRepository),
    inject(CloudRecordRepository),
  );

  uid(): string | null {
    return this.account.profile()?.uid ?? null;
  }

  create(name: string): Promise<Tournament> {
    return this.tournaments.create(name, this.requireProfile());
  }

  find(code: string): Promise<Tournament | null> {
    return this.tournaments.find(code);
  }

  join(code: string): Promise<JoinResult> {
    return this.tournaments.join(code, this.requireProfile());
  }

  start(t: Tournament, mapIds: readonly string[], circuitIds: readonly string[] = []): Promise<boolean> {
    return this.tournaments.start(t, this.uid() ?? '', mapIds, circuitIds);
  }

  mine(): Promise<Tournament[]> {
    const uid = this.uid();
    return uid ? this.tournaments.mine(uid) : Promise.resolve([]);
  }

  board(t: Tournament): Promise<TournamentBoard> {
    return this.tournaments.board(t);
  }

  /** Foto del cartel de un piloto en el torneo (null sin foto o sin red). */
  photoOf(code: string, uid: string): Promise<string | null> {
    return this.photos.get(code, uid).catch(() => null);
  }

  async savePhoto(code: string, dataUrl: string): Promise<void> {
    if (!isValidPhoto(dataUrl)) throw new Error('Foto no válida');
    await this.photos.save(code, this.requireProfile().uid, dataUrl);
  }

  async removePhoto(code: string): Promise<void> {
    await this.photos.remove(code, this.requireProfile().uid);
  }

  photoDeclined(code: string): boolean {
    return this.settings.getPhotoDeclined(code);
  }

  declinePhoto(code: string): void {
    this.settings.setPhotoDeclined(code);
  }

  /** Enlace para invitar: abre la pantalla de unirse con el código ya puesto. */
  inviteLink(code: string): string {
    return `${location.origin}/t/${code}`;
  }

  private requireProfile() {
    const profile = this.account.profile();
    if (!profile) throw new Error('Sin piloto');
    return profile;
  }
}
