import { Provider } from '@angular/core';
import { AudioPort } from '../../core/application/ports/out/audio.port';
import { MenuBackdropPort } from '../../core/application/ports/out/menu-backdrop.port';
import { WebAudioAdapter } from '../audio/web-audio.adapter';
import { LazyMenuBackdrop } from '../render/lazy-menu-backdrop';

/**
 * Adaptadores de los menús. El fondo 3D se carga de forma diferida (Three.js); el audio solo
 * suena para el ejemplo del volumen en Ajustes.
 */
export function provideMenuAdapters(): Provider[] {
  return [
    { provide: MenuBackdropPort, useClass: LazyMenuBackdrop },
    { provide: AudioPort, useClass: WebAudioAdapter },
  ];
}
