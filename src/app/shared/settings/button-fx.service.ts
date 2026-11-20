import { inject, Injectable, signal } from '@angular/core';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';

/** Efecto de píxeles de los botones: se puede apagar en Ajustes (se guarda en el móvil). */
@Injectable({ providedIn: 'root' })
export class ButtonFxService {
  private readonly settings = inject(SettingsRepository);
  private readonly on = signal(this.settings.getButtonFx());
  readonly enabled = this.on.asReadonly();

  set(on: boolean): void {
    this.on.set(on);
    this.settings.setButtonFx(on);
  }
}
