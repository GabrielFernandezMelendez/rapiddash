import { CountryCode } from '../profile/country';
import { PHYSICS_VERSION } from './physics-version';

/** Récord de un piloto en un mapa, tal y como se ve en el ranking. */
export interface CloudRecord {
  readonly mapId: string;
  readonly uid: string;
  readonly nickname: string;
  readonly country: CountryCode | null;
  /** Segundos. */
  readonly time: number;
  readonly physicsVersion: number;
}

/**
 * Límites de un tiempo creíble (s). Las reglas de Firestore repiten estos números: si se
 * cambian aquí, hay que cambiarlos también en firestore.rules.
 */
export const CLOUD_TIME_MIN = 10;
export const CLOUD_TIME_MAX = 3600;

export function isPlausibleTime(time: number): boolean {
  return Number.isFinite(time) && time > CLOUD_TIME_MIN && time < CLOUD_TIME_MAX;
}

/** ¿Hay que subir este tiempo? Si no hay récord en la nube, si es de otra física o si lo mejora. */
export function improvesCloudRecord(time: number, current: CloudRecord | null): boolean {
  if (!isPlausibleTime(time)) return false;
  if (!current || current.physicsVersion !== PHYSICS_VERSION) return true;
  return time < current.time;
}
