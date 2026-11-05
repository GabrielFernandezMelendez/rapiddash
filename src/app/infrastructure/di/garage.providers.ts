import { Provider } from '@angular/core';
import { GarageScenePort } from '../../core/application/ports/out/garage-scene.port';
import { GarageSceneAdapter } from '../render/three/garage/garage-scene.adapter';

/** Escena del garaje: se crea y se destruye con su página (Three.js se carga con ella). */
export function provideGarageAdapters(): Provider[] {
  return [{ provide: GarageScenePort, useClass: GarageSceneAdapter }];
}
