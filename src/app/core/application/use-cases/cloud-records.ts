import { improvesCloudRecord, CloudRecord } from '../../domain/race/cloud-record';
import { BestRun } from '../../domain/race/ghost';
import { isCurrentPhysics } from '../../domain/race/physics-version';
import { Profile } from '../../domain/profile/profile';
import { BestRunRepository } from '../ports/out/best-run.repository';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';

export type PublishResult = 'uploaded' | 'skipped';

/**
 * Sube a la nube los récords personales. Se llama al hacer récord y, al arrancar, con los
 * récords locales (así se suben los que se hicieron sin red o antes de tener cuenta).
 */
export class CloudRecords {
  constructor(
    private readonly cloud: CloudRecordRepository,
    private readonly bestRuns: BestRunRepository,
  ) {}

  async publish(run: BestRun, profile: Profile | null): Promise<PublishResult> {
    if (!profile || !isCurrentPhysics(run)) return 'skipped';
    // Sin red la lectura puede fallar: se intenta subir igualmente (las reglas solo aceptan mejoras)
    const current = await this.cloud.mine(run.mapId, profile.uid).catch(() => null);
    if (!improvesCloudRecord(run.time, current)) return 'skipped';
    const record: CloudRecord = {
      mapId: run.mapId,
      uid: profile.uid,
      nickname: profile.nickname,
      country: profile.country,
      time: run.time,
      physicsVersion: run.physicsVersion,
    };
    await this.cloud.save(record, run.frames);
    return 'uploaded';
  }

  /** Tras cambiar apodo o país: mis récords en la nube muestran los nuevos. */
  async updateIdentity(profile: Profile, mapIds: readonly string[]): Promise<number> {
    let updated = 0;
    for (const mapId of mapIds) {
      try {
        const mine = await this.cloud.mine(mapId, profile.uid);
        if (mine && (mine.nickname !== profile.nickname || mine.country !== profile.country)) {
          await this.cloud.updateIdentity(mapId, profile.uid, profile.nickname, profile.country);
          updated++;
        }
      } catch {
        // Se corregirá con el siguiente récord en ese mapa
      }
    }
    return updated;
  }

  /** Sube los récords locales que mejoran los de la nube. Un mapa que falla no para a los demás. */
  async syncLocalBests(profile: Profile, mapIds: readonly string[]): Promise<number> {
    let uploaded = 0;
    for (const mapId of mapIds) {
      try {
        const run = await this.bestRuns.get(mapId);
        if (run && (await this.publish(run, profile)) === 'uploaded') uploaded++;
      } catch {
        // Se reintentará en el próximo arranque
      }
    }
    return uploaded;
  }
}
