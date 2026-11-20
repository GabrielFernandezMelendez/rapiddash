import { GarageChoice } from '../../../domain/garage/garage';
import { Language } from '../../../domain/settings/language';
import { Volumes } from '../../../domain/settings/volume';
import { RivalChoice } from '../../../domain/race/ranking';

/** Preferencias del jugador que se recuerdan entre partidas. */
export abstract class SettingsRepository {
  abstract getLanguage(): Language | null;
  abstract setLanguage(language: Language): void;
  /** Último rival elegido en cada mapa. */
  abstract getRival(mapId: string): RivalChoice | null;
  abstract setRival(mapId: string, choice: RivalChoice): void;
  /** Ya vio el tutorial (o lo saltó). */
  abstract getTutorialSeen(): boolean;
  abstract setTutorialSeen(): void;
  abstract getVolumes(): Volumes;
  abstract setVolumes(volumes: Volumes): void;
  /** «Ahora no» a poner la foto en el cartel de ese torneo: no se vuelve a ofrecer sola. */
  abstract getPhotoDeclined(code: string): boolean;
  abstract setPhotoDeclined(code: string): void;
  /** Coche y efecto del garaje, tal cual se guardaron (se comprueban con `usableGarage`). */
  abstract getGarage(): unknown;
  abstract setGarage(choice: GarageChoice): void;
  /** Modo debug (7 toques en la versión): abre todo el contenido y todos los mapas. */
  abstract getDebug(): boolean;
  abstract setDebug(on: boolean): void;
  /** Laboratorio de física (debug): los parámetros cambiados, tal cual se guardaron. */
  abstract getPhysicsLab(): unknown;
  abstract setPhysicsLab(values: object | null): void;
  /** Coches ganados con el cubo azul del mapa del día. */
  abstract getWonCars(): number[];
  abstract addWonCar(car: number): void;
  /** Efectos ganados con el cubo azul del mapa del día. */
  abstract getWonFx(): number[];
  abstract addWonFx(fx: number): void;
  /** Último día (AAAA-MM-DD) en que se cogió el cubo: uno al día. */
  abstract getCubeDay(): string | null;
  abstract setCubeDay(key: string): void;
  /** Última versión cuyas novedades se vieron (null: ninguna). */
  abstract getPatchSeen(): string | null;
  abstract setPatchSeen(version: string): void;
}
