import { Aesthetic } from '../../../domain/settings/aesthetic';
import { Language } from '../../../domain/settings/language';

/** Preferencias del jugador que se recuerdan entre partidas. */
export abstract class SettingsRepository {
  abstract getLanguage(): Language | null;
  abstract setLanguage(language: Language): void;
  abstract getAesthetic(): Aesthetic | null;
  abstract setAesthetic(aesthetic: Aesthetic): void;
}
