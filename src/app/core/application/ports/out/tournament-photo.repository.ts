/**
 * Fotos del cartel del líder, una por piloto y torneo (JPEG en data URL).
 * Solo las ven los miembros del torneo; cada uno sube o borra la suya.
 */
export abstract class TournamentPhotoRepository {
  /** null si ese piloto no tiene foto en el torneo. */
  abstract get(code: string, uid: string): Promise<string | null>;
  abstract save(code: string, uid: string, dataUrl: string): Promise<void>;
  abstract remove(code: string, uid: string): Promise<void>;
}
