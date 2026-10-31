import { Aesthetic } from '../../../domain/settings/aesthetic';
import { Language } from '../../../domain/settings/language';
import { Volumes } from '../../../domain/settings/volume';
import { RivalChoice } from '../../../domain/race/ranking';

/** Preferencias del jugador que se recuerdan entre partidas. */
export abstract class SettingsRepository {
  abstract getLanguage(): Language | null;
  abstract setLanguage(language: Language): void;
  abstract getAesthetic(): Aesthetic | null;
  abstract setAesthetic(aesthetic: Aesthetic): void;
  /** Último rival elegido en cada mapa. */
  abstract getRival(mapId: string): RivalChoice | null;
  abstract setRival(mapId: string, choice: RivalChoice): void;
  /** Ya vio el tutorial (o lo saltó). */
  /** Aviso de que la estética se cambia en Ajustes (sale una sola vez). */
  abstract getAestheticHintSeen(): boolean;
  abstract setAestheticHintSeen(): void;
  abstract getTutorialSeen(): boolean;
  abstract setTutorialSeen(): void;
  abstract getVolumes(): Volumes;
  abstract setVolumes(volumes: Volumes): void;
  /** «Ahora no» a poner la foto en el cartel de ese torneo: no se vuelve a ofrecer sola. */
  abstract getPhotoDeclined(code: string): boolean;
  abstract setPhotoDeclined(code: string): void;
}
