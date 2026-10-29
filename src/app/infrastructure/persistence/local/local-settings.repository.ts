import { SettingsRepository } from '../../../core/application/ports/out/settings.repository';
import { isLanguage, Language } from '../../../core/domain/settings/language';
import { readJson, writeJson } from './safe-storage';

const LANGUAGE_KEY = 'rapiddash.language';

export class LocalSettingsRepository extends SettingsRepository {
  getLanguage(): Language | null {
    const value = readJson<unknown>(LANGUAGE_KEY);
    return isLanguage(value) ? value : null;
  }

  setLanguage(language: Language): void {
    writeJson(LANGUAGE_KEY, language);
  }
}
