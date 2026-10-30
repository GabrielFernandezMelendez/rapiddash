import { SettingsRepository } from '../../../core/application/ports/out/settings.repository';
import { Aesthetic, isAesthetic } from '../../../core/domain/settings/aesthetic';
import { isLanguage, Language } from '../../../core/domain/settings/language';
import { readJson, writeJson } from './safe-storage';

const LANGUAGE_KEY = 'rapiddash.language';
const AESTHETIC_KEY = 'rapiddash.aesthetic';

export class LocalSettingsRepository extends SettingsRepository {
  getLanguage(): Language | null {
    const value = readJson<unknown>(LANGUAGE_KEY);
    return isLanguage(value) ? value : null;
  }

  setLanguage(language: Language): void {
    writeJson(LANGUAGE_KEY, language);
  }

  getAesthetic(): Aesthetic | null {
    const value = readJson<unknown>(AESTHETIC_KEY);
    return isAesthetic(value) ? value : null;
  }

  setAesthetic(aesthetic: Aesthetic): void {
    writeJson(AESTHETIC_KEY, aesthetic);
  }
}
