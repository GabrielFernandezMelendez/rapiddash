import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { BestRun } from '../../../core/domain/race/ghost';
import { isCurrentPhysics } from '../../../core/domain/race/physics-version';
import { readJson, removeKey, writeJson } from './safe-storage';

const key = (mapId: string) => `rapiddash.best.${mapId}`;
// Claves antiguas, con la versión en el nombre: se borran al leer para liberar espacio
const legacyKey = (mapId: string) => `rapiddash.best.v2.${mapId}`;

export class LocalBestRunRepository extends BestRunRepository {
  async get(mapId: string): Promise<BestRun | null> {
    removeKey(legacyKey(mapId));
    const run = readJson<BestRun>(key(mapId));
    if (!run || !Array.isArray(run.frames) || typeof run.time !== 'number') return null;
    // Récord de otra física: no es comparable, se trata como si no hubiera récord
    return isCurrentPhysics(run) ? run : null;
  }

  async save(run: BestRun): Promise<void> {
    writeJson(key(run.mapId), run);
  }
}
