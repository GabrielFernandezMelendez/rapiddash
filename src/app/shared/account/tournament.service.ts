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
  /** Clasificaciones y fotos ya descargadas: la carrera las usa sin esperar a la red. */
  private readonly boards = new Map<string, TournamentBoard>();
  private readonly photoCache = new Map<string, string | null>();
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

  remove(t: Tournament): Promise<boolean> {
    return this.tournaments.remove(t, this.uid() ?? '');
  }

  mine(): Promise<Tournament[]> {
    const uid = this.uid();
    return uid ? this.tournaments.mine(uid) : Promise.resolve([]);
  }

  async board(t: Tournament): Promise<TournamentBoard> {
    const board = await this.tournaments.board(t);
    this.boards.set(t.code, board);
    return board;
  }

  /** Última clasificación cargada (para pintar los carteles al instante al entrar en carrera). */
  cachedBoard(code: string): TournamentBoard | null {
    return this.boards.get(code) ?? null;
  }

  /** Foto del cartel de un piloto en el torneo (null sin foto o sin red). */
  async photoOf(code: string, uid: string): Promise<string | null> {
    const photo = await this.photos.get(code, uid).catch(() => undefined);
    if (photo === undefined) return this.photoCache.get(`${code}/${uid}`) ?? null;
    this.photoCache.set(`${code}/${uid}`, photo);
    return photo;
  }

  /** Foto ya descargada (undefined si aún no se ha pedido). */
  cachedPhoto(code: string, uid: string): string | null | undefined {
    return this.photoCache.get(`${code}/${uid}`);
  }

  async savePhoto(code: string, dataUrl: string): Promise<void> {
    if (!isValidPhoto(dataUrl)) throw new Error('Foto no válida');
    const uid = this.requireProfile().uid;
    await this.photos.save(code, uid, dataUrl);
    this.photoCache.set(`${code}/${uid}`, dataUrl);
  }

  async removePhoto(code: string): Promise<void> {
    const uid = this.requireProfile().uid;
    await this.photos.remove(code, uid);
    this.photoCache.set(`${code}/${uid}`, null);
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
