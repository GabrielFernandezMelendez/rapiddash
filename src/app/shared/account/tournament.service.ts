import { inject, Injectable } from '@angular/core';
import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { JoinResult, TournamentRepository } from '../../core/application/ports/out/tournament.repository';
import { TournamentBoard, Tournaments } from '../../core/application/use-cases/tournaments';
import { Tournament } from '../../core/domain/tournament/tournament';
import { AccountService } from './account.service';

/** Torneos para las pantallas, con el piloto de la sesión. */
@Injectable({ providedIn: 'root' })
export class TournamentService {
  private readonly account = inject(AccountService);
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

  start(t: Tournament, mapIds: readonly string[]): Promise<boolean> {
    return this.tournaments.start(t, this.uid() ?? '', mapIds);
  }

  mine(): Promise<Tournament[]> {
    const uid = this.uid();
    return uid ? this.tournaments.mine(uid) : Promise.resolve([]);
  }

  board(t: Tournament): Promise<TournamentBoard> {
    return this.tournaments.board(t);
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
