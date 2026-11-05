import { computed, inject, Injectable, signal } from '@angular/core';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import {
  GarageChoice,
  isCarUnlocked,
  isFxUnlocked,
  usableGarage,
} from '../../core/domain/garage/garage';

/** Garaje y modo debug para las pantallas: lo elegido se guarda en el móvil. */
@Injectable({ providedIn: 'root' })
export class GarageService {
  private readonly settings = inject(SettingsRepository);

  /** Modo debug: abre todos los coches, efectos y mapas. */
  readonly debug = signal(this.settings.getDebug());
  private readonly stored = signal<unknown>(this.settings.getGarage());
  /** Lo que lleva el jugador (lo cerrado vuelve a lo de serie). */
  readonly choice = computed<GarageChoice>(() => usableGarage(this.stored(), this.debug()));

  carUnlocked(car: number | null): boolean {
    return isCarUnlocked(car, this.debug());
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
