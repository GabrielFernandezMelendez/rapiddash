import { CloudRecord } from '../../domain/race/cloud-record';
import { isCurrentPhysics } from '../../domain/race/physics-version';
import {
  Duel,
  duelBoardId,
  duelStatus,
  isDuelMember,
  newDuelPlayer,
  pickDuelMap,
} from '../../domain/duel/duel';
import { GarageChoice } from '../../domain/garage/garage';
import { Profile } from '../../domain/profile/profile';
import { generateCode, normalizeCode } from '../../domain/tournament/tournament';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';
import { DuelJoinResult, DuelRepository } from '../ports/out/duel.repository';

/** Crear, unirse y correr duelos 1 vs 1. */
export class Duels {
  constructor(
    private readonly repo: DuelRepository,
    private readonly records: CloudRecordRepository,
    private readonly random: () => number = Math.random,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** El circuito se sortea al crear el duelo: el rival ya lo ve antes de entrar. */
  async create(owner: Profile, garage: GarageChoice, mapIds: readonly string[]): Promise<Duel> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const duel: Duel = {
        code: generateCode(this.random),
        ownerUid: owner.uid,
        members: [{ uid: owner.uid, nickname: owner.nickname, country: owner.country }],
        players: { [owner.uid]: newDuelPlayer(garage) },
        startedAt: null,
        mapId: pickDuelMap(mapIds, this.random),
      };
      if ((await this.repo.create(duel)) === 'created') return duel;
    }
    throw new Error('No se pudo generar un código libre');
  }

  find(raw: string): Promise<Duel | null> {
    const code = normalizeCode(raw);
    return code ? this.repo.get(code) : Promise.resolve(null);
  }

  join(raw: string, profile: Profile, garage: GarageChoice): Promise<DuelJoinResult> {
    const code = normalizeCode(raw);
    if (!code) return Promise.resolve('not-found');
    const member = { uid: profile.uid, nickname: profile.nickname, country: profile.country };
    return this.repo.join(code, member, garage);
  }

  /** Mis duelos: en curso primero, luego esperando y al final los terminados. */
  async mine(uid: string): Promise<Duel[]> {
    const order = { running: 0, waiting: 1, finished: 2 };
    const rank = (d: Duel) => order[duelStatus(d, this.now())];
    const list = await this.repo.mine(uid);
    return [...list].sort((a, b) => rank(a) - rank(b) || (b.startedAt ?? 0) - (a.startedAt ?? 0));
  }

  startAttempt(code: string, uid: string, garage: GarageChoice): Promise<boolean> {
    return this.repo.startAttempt(code, uid, garage);
  }

  markDone(code: string, uid: string): Promise<void> {
    return this.repo.markDone(code, uid);
  }

  /** Solo el creador, en cualquier momento (como los torneos). */
  async remove(duel: Duel, uid: string): Promise<boolean> {
    if (duel.ownerUid !== uid) return false;
    await this.repo.remove(duel.code);
    return true;
  }

  /** Mejor tiempo de cada piloto, el más rápido primero. Sin red, los que pueda dar la caché. */
  async scores(duel: Duel): Promise<CloudRecord[]> {
    const records = await this.records.top(duelBoardId(duel.code), 10);
    return records
      .filter(isCurrentPhysics)
      .filter((r) => isDuelMember(duel, r.uid))
      .sort((a, b) => a.time - b.time);
  }
}
