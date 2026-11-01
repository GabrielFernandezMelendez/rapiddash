import { effect, inject, Injectable, untracked } from '@angular/core';
import { BestRunRepository } from '../../core/application/ports/out/best-run.repository';
import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { CloudRecords } from '../../core/application/use-cases/cloud-records';
import { RecordSink } from '../../core/application/use-cases/race-session';
import { BestRun } from '../../core/domain/race/ghost';
import { TournamentRepository } from '../../core/application/ports/out/tournament.repository';
import { dailyBoardId, dailyKey } from '../../core/domain/daily/daily-map';
import { dayBoardId, TOURNAMENT_DAYS } from '../../core/domain/tournament/tournament';
import { AccountService } from './account.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Publica los récords del piloto: al hacer uno nuevo y, una vez por sesión, los locales que
 * aún no estén en la nube (hechos sin red o antes de tener cuenta).
 */
@Injectable({ providedIn: 'root' })
export class CloudRecordsService implements RecordSink {
  private readonly account = inject(AccountService);
  private readonly tournaments = inject(TournamentRepository);
  private readonly records = new CloudRecords(inject(CloudRecordRepository), inject(BestRunRepository));
  private syncedFor: string | null = null;
  /** Apodo y país con los que se subieron los récords de este piloto. */
  private identity: { uid: string; nickname: string; country: string | null } | null = null;

  constructor() {
    // Cuando hay piloto (al arrancar o al crearlo), se suben los récords pendientes
    effect(() => {
      const profile = this.account.profile();
      if (!profile || profile.uid === this.syncedFor) return;
      this.syncedFor = profile.uid;
      untracked(() => setTimeout(() => void this.sync(), 4000));
    });
    // Al cambiar apodo o país en el perfil, mis récords subidos se actualizan
    effect(() => {
      const profile = this.account.profile();
      const previous = this.identity;
      this.identity = profile
        ? { uid: profile.uid, nickname: profile.nickname, country: profile.country }
        : null;
      if (!profile || !previous || previous.uid !== profile.uid) return;
      if (previous.nickname === profile.nickname && previous.country === profile.country) return;
      untracked(() => void this.updateIdentity());
    });
  }

  publish(run: BestRun): void {
    void this.records.publish(run, this.account.profile()).catch((e) => {
      // Sin red, Firestore deja la escritura en cola; otros errores se reintentan al arrancar
      console.warn('[récords] no se pudo subir', e);
    });
  }

  /**
   * Rankings donde puedo tener récord: los mapas, el mapa del día de hoy y de ayer y los días de
   * mis torneos (todos llevan mi apodo y mi bandera).
   */
  private async updateIdentity(withMaps = true): Promise<void> {
    const profile = this.account.profile();
    if (!profile) return;
    const { ALL_MAPS } = await import('../../core/domain/track/race-map');
    const now = Date.now();
    const daily = [now, now - DAY_MS].map((ms) => dailyBoardId(dailyKey(new Date(ms))));
    const mine = await this.tournaments.mine(profile.uid).catch(() => []);
    const tournamentDays = mine
      .filter((t) => t.startedAt !== null)
      .flatMap((t) => Array.from({ length: TOURNAMENT_DAYS }, (_, day) => dayBoardId(t.code, day)));
    await this.records.updateIdentity(profile, [
      ...(withMaps ? ALL_MAPS.map((m) => m.id) : []),
      ...daily,
      ...tournamentDays,
    ]);
  }

  private async sync(): Promise<void> {
    const profile = this.account.profile();
    if (!profile || globalThis.navigator?.onLine === false) return;
    // Los mapas se cargan aquí para no meterlos en el arranque
    const { ALL_MAPS } = await import('../../core/domain/track/race-map');
    await this.records.syncLocalBests(
      profile,
      ALL_MAPS.map((m) => m.id),
    );
    // Los rankings del día y de los torneos, por si el apodo o la bandera cambiaron en otra sesión
    // (o antes de que existiera esto); los de los mapas ya se actualizan al cambiar el perfil
    await this.updateIdentity(false);
  }
}
