import { computed, inject, Injectable, signal } from '@angular/core';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import {
  GarageChoice,
  isCarUnlocked,
  isFxUnlocked,
  lockedPrizes,
  pickPrize,
  Prize,
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
  /** Efectos ganados con el cubo del mapa del día. */
  readonly wonFx = signal<readonly number[]>(this.settings.getWonFx());
  /** Lo que lleva el jugador (lo cerrado vuelve a lo de serie). */
  readonly choice = computed<GarageChoice>(() =>
    usableGarage(this.stored(), this.debug(), this.won(), this.wonFx()),
  );

  carUnlocked(car: number | null): boolean {
    return isCarUnlocked(car, this.debug(), this.won());
  }

  /** ¿Hay cubo hoy? Solo si no se cogió ya y queda algo por ganar. */
  cubeAvailable(dayKey: string): boolean {
    return this.settings.getCubeDay() !== dayKey && this.lockedPrizes().length > 0;
  }

  /** Coches y efectos que aún se pueden ganar. */
  lockedPrizes(): Prize[] {
    return lockedPrizes(this.won(), this.wonFx());
  }

  /** Cubo cogido: regala un coche o efecto cerrado al azar (y no vuelve a salir ese día). */
  claimCube(dayKey: string): Prize | null {
    if (!this.cubeAvailable(dayKey)) return null;
    const prize = pickPrize(this.won(), this.wonFx());
    this.settings.setCubeDay(dayKey);
    if (!prize) return null;
    if (prize.kind === 'car') {
      this.settings.addWonCar(prize.id);
      this.won.set(this.settings.getWonCars());
    } else {
      this.settings.addWonFx(prize.id);
      this.wonFx.set(this.settings.getWonFx());
    }
    return prize;
  }

  fxUnlocked(fx: number): boolean {
    return isFxUnlocked(fx, this.debug(), this.wonFx());
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
