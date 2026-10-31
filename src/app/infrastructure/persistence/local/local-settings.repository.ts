import { SettingsRepository } from '../../../core/application/ports/out/settings.repository';
import { Aesthetic, isAesthetic } from '../../../core/domain/settings/aesthetic';
import { isLanguage, Language } from '../../../core/domain/settings/language';
import { toVolumes, Volumes } from '../../../core/domain/settings/volume';
import { RIVAL_CHOICES, RivalChoice } from '../../../core/domain/race/ranking';
import { readJson, writeJson } from './safe-storage';

const LANGUAGE_KEY = 'rapiddash.language';
const AESTHETIC_KEY = 'rapiddash.aesthetic';
const RIVALS_KEY = 'rapiddash.rivals';
const TUTORIAL_KEY = 'rapiddash.tutorialSeen';
const VOLUMES_KEY = 'rapiddash.volumes';

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

  getRival(mapId: string): RivalChoice | null {
    const value = readJson<Record<string, unknown>>(RIVALS_KEY)?.[mapId];
    return RIVAL_CHOICES.includes(value as RivalChoice) ? (value as RivalChoice) : null;
  }

  setRival(mapId: string, choice: RivalChoice): void {
    writeJson(RIVALS_KEY, { ...readJson<Record<string, unknown>>(RIVALS_KEY), [mapId]: choice });
  }

  getTutorialSeen(): boolean {
    return readJson<boolean>(TUTORIAL_KEY) === true;
  }

  setTutorialSeen(): void {
    writeJson(TUTORIAL_KEY, true);
  }

  getVolumes(): Volumes {
    return toVolumes(readJson<unknown>(VOLUMES_KEY));
  }

  setVolumes(volumes: Volumes): void {
    writeJson(VOLUMES_KEY, toVolumes(volumes));
  }
}
