import { SettingsRepository } from '../../../core/application/ports/out/settings.repository';
import { isLanguage, Language } from '../../../core/domain/settings/language';
import { toVolumes, Volumes } from '../../../core/domain/settings/volume';
import { RIVAL_CHOICES, RivalChoice } from '../../../core/domain/race/ranking';
import { GarageChoice } from '../../../core/domain/garage/garage';
import { readJson, writeJson } from './safe-storage';

const LANGUAGE_KEY = 'rapiddash.language';
const RIVALS_KEY = 'rapiddash.rivals';
const TUTORIAL_KEY = 'rapiddash.tutorialSeen';
const VOLUMES_KEY = 'rapiddash.volumes';
const PHOTO_DECLINED_KEY = 'rapiddash.photoDeclined';
const GARAGE_KEY = 'rapiddash.garage';
const DEBUG_KEY = 'rapiddash.debug';
const WON_CARS_KEY = 'rapiddash.wonCars';
const CUBE_DAY_KEY = 'rapiddash.cubeDay';

export class LocalSettingsRepository extends SettingsRepository {
  getLanguage(): Language | null {
    const value = readJson<unknown>(LANGUAGE_KEY);
    return isLanguage(value) ? value : null;
  }

  setLanguage(language: Language): void {
    writeJson(LANGUAGE_KEY, language);
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

  getPhotoDeclined(code: string): boolean {
    return readJson<Record<string, unknown>>(PHOTO_DECLINED_KEY)?.[code] === true;
  }

  setPhotoDeclined(code: string): void {
    writeJson(PHOTO_DECLINED_KEY, { ...readJson<Record<string, unknown>>(PHOTO_DECLINED_KEY), [code]: true });
  }

  getGarage(): unknown {
    return readJson<unknown>(GARAGE_KEY);
  }

  setGarage(choice: GarageChoice): void {
    writeJson(GARAGE_KEY, choice);
  }

  getDebug(): boolean {
    return readJson<unknown>(DEBUG_KEY) === true;
  }

  setDebug(on: boolean): void {
    writeJson(DEBUG_KEY, on);
  }

  getWonCars(): number[] {
    const value = readJson<unknown>(WON_CARS_KEY);
    return Array.isArray(value) ? value.filter((v): v is number => Number.isInteger(v)) : [];
  }

  addWonCar(car: number): void {
    const won = this.getWonCars();
    if (!won.includes(car)) writeJson(WON_CARS_KEY, [...won, car]);
  }

  getCubeDay(): string | null {
    const value = readJson<unknown>(CUBE_DAY_KEY);
    return typeof value === 'string' ? value : null;
  }

  setCubeDay(key: string): void {
    writeJson(CUBE_DAY_KEY, key);
  }
}
