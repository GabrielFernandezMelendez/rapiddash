import { Provider } from '@angular/core';
import { MenuBackdropPort } from '../../core/application/ports/out/menu-backdrop.port';
import { LazyMenuBackdrop } from '../render/lazy-menu-backdrop';

/** Adaptadores de los menús. El fondo 3D se carga de forma diferida (Three.js). */
export function provideMenuAdapters(): Provider[] {
  return [{ provide: MenuBackdropPort, useClass: LazyMenuBackdrop }];
}
