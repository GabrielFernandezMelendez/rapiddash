import { computed, inject, Injectable, signal } from '@angular/core';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import {
  GarageChoice,
  isCarUnlocked,
  isFxUnlocked,
  pickPrize,
  usableGarage,
} from '../../core/domain/garage/garage';

/** Garaje y modo debug para las pantallas: lo elegido se guarda en el móvil. */
@Injectable({ providedIn: 'root' })
export class GarageService {
  private readonly settings = inject(SettingsRepository);

  /** Modo debug: abre todos los coches, efectos y mapas. */
  readonly debug = signal(this.settings.getDebug());
  private readonly stored = signal<unknown>(this.settings.getGarage());
  /** Coches ganados con el cubo del mapa del día. */
  readonly won = signal<readonly number[]>(this.settings.getWonCars());
  /** Lo que lleva el jugador (lo cerrado vuelve a lo de serie). */
  readonly choice = computed<GarageChoice>(() =>
    usableGarage(this.stored(), this.debug(), this.won()),
  );

  carUnlocked(car: number | null): boolean {
    return isCarUnlocked(car, this.debug(), this.won());
  }

  /** ¿Hay cubo hoy? Solo si no se cogió ya y queda algún coche por ganar. */
  cubeAvailable(dayKey: string): boolean {
    return this.settings.getCubeDay() !== dayKey && pickPrize(this.won()) !== null;
  }

  /** Cubo cogido: regala un coche cerrado al azar (y no vuelve a salir ese día). */
  claimCube(dayKey: string): number | null {
    if (!this.cubeAvailable(dayKey)) return null;
    const car = pickPrize(this.won());
    this.settings.setCubeDay(dayKey);
    if (car === null) return null;
    this.settings.addWonCar(car);
    this.won.set(this.settings.getWonCars());
    return car;
  }

  fxUnlocked(fx: number): boolean {
    return isFxUnlocked(fx, this.debug());
  }

  selectCar(car: number | null): void {
    if (!this.carUnlocked(car)) return;
    this.save({ ...this.choice(), car });
  }

  selectFx(fx: number): void {
    if (!this.fxUnlocked(fx)) return;
    this.save({ ...this.choice(), fx });
  }

  setDebug(on: boolean): void {
    this.settings.setDebug(on);
    this.debug.set(on);
  }

  private save(choice: GarageChoice): void {
    this.settings.setGarage(choice);
    this.stored.set(choice);
  }
}
