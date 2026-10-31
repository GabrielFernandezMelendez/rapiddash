import { StandingRow } from './tournament';

/** Lado de la foto del cartel (px): se recorta cuadrada y se guarda en JPEG. */
export const PHOTO_SIZE = 256;
export const PHOTO_QUALITY = 0.82;
/** Tamaño máximo de la foto como data URL (lo repiten las reglas de Firestore). */
export const PHOTO_MAX_LENGTH = 140_000;
export const PHOTO_PREFIX = 'data:image/jpeg;base64,';

/** Líder del torneo: el 1.º de la clasificación, siempre que ya tenga puntos. */
export function leaderOf(rows: readonly StandingRow[]): StandingRow | null {
  const first = rows[0];
  return first && first.total > 0 ? first : null;
}

/** ¿Ofrecer al piloto poner su foto? Solo si va 1.º, aún no tiene foto y no dijo «Ahora no». */
export function shouldOfferPhoto(isLeader: boolean, hasPhoto: boolean, declined: boolean): boolean {
  return isLeader && !hasPhoto && !declined;
}

/** Una foto válida para subir: JPEG en data URL y no demasiado grande. */
export function isValidPhoto(dataUrl: string): boolean {
  return dataUrl.startsWith(PHOTO_PREFIX) && dataUrl.length <= PHOTO_MAX_LENGTH;
}
