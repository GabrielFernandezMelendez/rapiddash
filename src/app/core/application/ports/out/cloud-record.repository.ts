import { CloudRecord } from '../../../domain/race/cloud-record';
import { GhostFrame } from '../../../domain/race/ghost';

/** Récords y fantasmas de todos los pilotos, en la nube. */
export abstract class CloudRecordRepository {
  /** Mi récord en un mapa (de cualquier versión de física). */
  abstract mine(mapId: string, uid: string): Promise<CloudRecord | null>;
  /** Guarda récord y fantasma juntos: o se guardan los dos o ninguno. */
  abstract save(record: CloudRecord, ghost: readonly GhostFrame[]): Promise<void>;
  /** Los mejores de un mapa con la física actual, del más rápido al más lento. */
  abstract top(mapId: string, limit: number): Promise<CloudRecord[]>;
  /** Puesto que tendría ese tiempo en el ranking (1 = el mejor). */
  abstract rankOf(mapId: string, time: number): Promise<number>;
  abstract ghost(mapId: string, uid: string): Promise<GhostFrame[] | null>;
}
