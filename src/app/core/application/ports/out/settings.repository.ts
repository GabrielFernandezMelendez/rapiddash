import { Aesthetic } from '../../../domain/settings/aesthetic';
import { Language } from '../../../domain/settings/language';
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
  abstract getTutorialSeen(): boolean;
  abstract setTutorialSeen(): void;
}
