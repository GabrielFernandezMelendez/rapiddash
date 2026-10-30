import { BestRun } from '../../../domain/race/ghost';

/** Mejor vuelta personal por mapa (tiempo + fantasma). */
export abstract class BestRunRepository {
  abstract get(mapId: string): Promise<BestRun | null>;
  abstract save(run: BestRun): Promise<void>;
}
