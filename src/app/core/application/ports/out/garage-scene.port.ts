/** Escena 3D del garaje: el coche girando en su plataforma y el efecto al acelerar. */
export abstract class GarageScenePort {
  abstract attach(host: HTMLElement): void;
  /** `car: null` = el deportivo retro de serie. */
  abstract show(car: number | null): void;
  abstract setFx(fx: number): void;
  abstract setAccelerating(on: boolean): void;
  abstract dispose(): void;
}
