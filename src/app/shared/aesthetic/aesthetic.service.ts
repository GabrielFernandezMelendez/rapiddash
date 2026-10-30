import { inject, Injectable, signal } from '@angular/core';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import { Aesthetic, DEFAULT_AESTHETIC } from '../../core/domain/settings/aesthetic';

/**
 * Estética elegida en Ajustes. Se refleja en `<html data-aesthetic="…">` para que los estilos
 * cambien con tokens CSS, y la página de carrera la pasa al renderer.
 */
@Injectable({ providedIn: 'root' })
export class AestheticService {
  private readonly settings = inject(SettingsRepository);
  readonly aesthetic = signal<Aesthetic>(DEFAULT_AESTHETIC);

  init(): void {
    this.apply(this.settings.getAesthetic() ?? DEFAULT_AESTHETIC);
  }

  set(aesthetic: Aesthetic): void {
    this.settings.setAesthetic(aesthetic);
    this.apply(aesthetic);
  }

  private apply(aesthetic: Aesthetic): void {
    this.aesthetic.set(aesthetic);
    document.documentElement.dataset['aesthetic'] = aesthetic;
  }
}
