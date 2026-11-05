import { Aesthetic } from '../../../domain/settings/aesthetic';

/** Escena 3D del garaje: el coche girando en su plataforma y el efecto al acelerar. */
export abstract class GarageScenePort {
  abstract attach(host: HTMLElement): void;
  /** `car: null` = el vehículo de serie de la estética (deportivo retro, nave o coche clásico). */
  abstract show(car: number | null, aesthetic: Aesthetic): void;
  abstract setFx(fx: number): void;
  abstract setAccelerating(on: boolean): void;
  abstract dispose(): void;
}
