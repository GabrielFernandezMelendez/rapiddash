import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { CloudRecord } from '../../core/domain/race/cloud-record';
import { GhostFrame } from '../../core/domain/race/ghost';
import { CountryCode } from '../../core/domain/profile/country';
import type { FirestoreCloudRecordRepository } from './firestore-cloud-record.repository';

/** Récords en la nube; Firestore se descarga la primera vez que hace falta. */
export class LazyCloudRecordRepository extends CloudRecordRepository {
  private repo: Promise<FirestoreCloudRecordRepository> | null = null;

  private load(): Promise<FirestoreCloudRecordRepository> {
    this.repo ??= import('./firestore-cloud-record.repository').then(
      (m) => new m.FirestoreCloudRecordRepository(),
    );
    this.repo.catch(() => (this.repo = null));
    return this.repo;
  }

  async mine(mapId: string, uid: string): Promise<CloudRecord | null> {
    return (await this.load()).mine(mapId, uid);
  }
  async save(record: CloudRecord, ghost: readonly GhostFrame[]): Promise<void> {
    return (await this.load()).save(record, ghost);
  }
  async top(mapId: string, limit: number): Promise<CloudRecord[]> {
    return (await this.load()).top(mapId, limit);
  }
  async rankOf(mapId: string, time: number): Promise<number> {
    return (await this.load()).rankOf(mapId, time);
  }
  async above(mapId: string, time: number): Promise<CloudRecord | null> {
    return (await this.load()).above(mapId, time);
  }
  async count(mapId: string): Promise<number> {
    return (await this.load()).count(mapId);
  }
  async updateIdentity(
    mapId: string,
    uid: string,
    nickname: string,
    country: CountryCode | null,
  ): Promise<void> {
    return (await this.load()).updateIdentity(mapId, uid, nickname, country);
  }
  async ghost(mapId: string, uid: string): Promise<GhostFrame[] | null> {
    return (await this.load()).ghost(mapId, uid);
  }
}
