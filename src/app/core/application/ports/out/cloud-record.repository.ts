import { CloudRecord } from '../../../domain/race/cloud-record';
import { GhostFrame } from '../../../domain/race/ghost';
import { CountryCode } from '../../../domain/profile/country';

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
  /** El récord justo más rápido que ese tiempo (el de encima en el ranking). */
  abstract above(mapId: string, time: number): Promise<CloudRecord | null>;
  /** Pilotos con tiempo en el mapa con la física actual. */
  abstract count(mapId: string): Promise<number>;
  abstract ghost(mapId: string, uid: string): Promise<GhostFrame[] | null>;
  /** Cambia apodo y país de mi récord (al editar el perfil), sin tocar el tiempo. */
  abstract updateIdentity(
    mapId: string,
    uid: string,
    nickname: string,
    country: CountryCode | null,
  ): Promise<void>;
}
