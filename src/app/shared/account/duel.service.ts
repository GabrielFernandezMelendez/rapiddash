import { inject, Injectable } from '@angular/core';
import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { DuelJoinResult, DuelRepository } from '../../core/application/ports/out/duel.repository';
import { Duels } from '../../core/application/use-cases/duels';
import { Duel } from '../../core/domain/duel/duel';
import { CloudRecord } from '../../core/domain/race/cloud-record';
import { CIRCUIT_MAPS } from '../../core/domain/track/race-map';
import { GarageService } from '../garage/garage.service';
import { AccountService } from './account.service';

/** Duelos 1 vs 1 para las pantallas, con el piloto y el coche de la sesión. */
@Injectable({ providedIn: 'root' })
export class DuelService {
  private readonly account = inject(AccountService);
  private readonly garage = inject(GarageService);
  private readonly duels = new Duels(inject(DuelRepository), inject(CloudRecordRepository));

  uid(): string | null {
    return this.account.profile()?.uid ?? null;
  }

  create(): Promise<Duel> {
    return this.duels.create(
      this.requireProfile(),
      this.garage.choice(),
      CIRCUIT_MAPS.map((m) => m.id),
    );
  }

  /** Con mi apodo y mi país del perfil (el duelo guarda los de cuando entré). */
  async find(code: string): Promise<Duel | null> {
    const duel = await this.duels.find(code);
    const me = this.account.profile();
    if (!duel || !me) return duel;
    return {
      ...duel,
      members: duel.members.map((m) =>
        m.uid === me.uid ? { ...m, nickname: me.nickname, country: me.country } : m,
      ),
    };
  }

  join(code: string): Promise<DuelJoinResult> {
    return this.duels.join(code, this.requireProfile(), this.garage.choice());
  }

  mine(): Promise<Duel[]> {
    const uid = this.uid();
    return uid ? this.duels.mine(uid) : Promise.resolve([]);
  }

  /** Gasta un intento con el coche que llevo ahora; false si ya no se puede correr. */
  startAttempt(code: string): Promise<boolean> {
    return this.duels.startAttempt(code, this.requireProfile().uid, this.garage.choice());
  }

  async markDone(code: string): Promise<void> {
    const uid = this.uid();
    if (uid) await this.duels.markDone(code, uid);
  }

  remove(duel: Duel): Promise<boolean> {
    return this.duels.remove(duel, this.uid() ?? '');
  }

  scores(duel: Duel): Promise<CloudRecord[]> {
    return this.duels.scores(duel);
  }

  /** Enlace para retar: abre la pantalla de unirse con el código ya puesto. */
  inviteLink(code: string): string {
    return `${location.origin}/d/${code}`;
  }

  private requireProfile() {
    const profile = this.account.profile();
    if (!profile) throw new Error('Sin piloto');
    return profile;
  }
}
