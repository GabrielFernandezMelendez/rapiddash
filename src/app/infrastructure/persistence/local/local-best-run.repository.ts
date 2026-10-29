import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { BestRun } from '../../../core/domain/race/ghost';
import { readJson, writeJson } from './safe-storage';

// v2: pista con cruces cuadrados; los fantasmas anteriores no son compatibles
const key = (mapId: string) => `rapiddash.best.v2.${mapId}`;

export class LocalBestRunRepository extends BestRunRepository {
  async get(mapId: string): Promise<BestRun | null> {
    const run = readJson<BestRun>(key(mapId));
    return run && Array.isArray(run.frames) && typeof run.time === 'number' ? run : null;
  }

  async save(run: BestRun): Promise<void> {
    writeJson(key(run.mapId), run);
  }
}
