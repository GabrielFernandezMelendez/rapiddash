import { effect, inject, Injectable, untracked } from '@angular/core';
import { BestRunRepository } from '../../core/application/ports/out/best-run.repository';
import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { CloudRecords } from '../../core/application/use-cases/cloud-records';
import { RecordSink } from '../../core/application/use-cases/race-session';
import { BestRun } from '../../core/domain/race/ghost';
import { AccountService } from './account.service';

/**
 * Publica los récords del piloto: al hacer uno nuevo y, una vez por sesión, los locales que
 * aún no estén en la nube (hechos sin red o antes de tener cuenta).
 */
@Injectable({ providedIn: 'root' })
export class CloudRecordsService implements RecordSink {
  private readonly account = inject(AccountService);
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

  private async updateIdentity(): Promise<void> {
    const profile = this.account.profile();
    if (!profile) return;
    const { ALL_MAPS } = await import('../../core/domain/track/race-map');
    await this.records.updateIdentity(
      profile,
      ALL_MAPS.map((m) => m.id),
    );
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
  }
}
