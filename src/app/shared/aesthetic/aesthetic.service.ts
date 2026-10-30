import { inject, Injectable, signal } from '@angular/core';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import { Aesthetic, DEFAULT_AESTHETIC, isSynthwave } from '../../core/domain/settings/aesthetic';

const SYNTH_FONTS_ID = 'rd-synth-fonts';
// Portada: Russo One y Mr Dafoe · menús: Kanit · carrera: Audiowide y Chakra Petch
const SYNTH_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Audiowide&family=Chakra+Petch:wght@400;500;600;700' +
  '&family=Kanit:ital,wght@0,500;0,600;0,700;0,800;1,600;1,700;1,800;1,900' +
  '&family=Mr+Dafoe&family=Russo+One&display=swap';

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
    this.syncThemeColor();
    if (isSynthwave(aesthetic)) this.loadSynthFonts();
  }

  /** Barra de estado y del navegador del mismo color que el fondo de la estética. */
  private syncThemeColor(): void {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const color = getComputedStyle(document.documentElement).getPropertyValue('--rd-asphalt').trim();
    if (meta && color) meta.content = color;
  }

  /** Las fuentes synthwave solo se descargan si se elige una de esas estéticas. */
  private loadSynthFonts(): void {
    if (document.getElementById(SYNTH_FONTS_ID)) return;
    const link = document.createElement('link');
    link.id = SYNTH_FONTS_ID;
    link.rel = 'stylesheet';
    link.href = SYNTH_FONTS_URL;
    document.head.appendChild(link);
  }
}
