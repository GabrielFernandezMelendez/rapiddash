import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { BestRun } from '../../../core/domain/race/ghost';
import { readJson, writeJson } from './safe-storage';

const key = (mapId: string) => `rapiddash.best.${mapId}`;

export class LocalBestRunRepository extends BestRunRepository {
  async get(mapId: string): Promise<BestRun | null> {
    const run = readJson<BestRun>(key(mapId));
    return run && Array.isArray(run.frames) && typeof run.time === 'number' ? run : null;
  }

  async save(run: BestRun): Promise<void> {
    writeJson(key(run.mapId), run);
  }
}
