import { Provider } from '@angular/core';
import { AudioPort } from '../../core/application/ports/out/audio.port';
import { GameLoopPort } from '../../core/application/ports/out/game-loop.port';
import { InputPort } from '../../core/application/ports/out/input.port';
import { RendererPort } from '../../core/application/ports/out/renderer.port';
import { WebAudioAdapter } from '../audio/web-audio.adapter';
import { RafGameLoop } from '../clock/raf-game-loop';
import { DeviceInputAdapter } from '../input/device-input.adapter';
import { ThreeRendererAdapter } from '../render/three/three-renderer.adapter';

/** Adaptadores de una carrera: se crean y destruyen con la página de carrera. */
export function provideRaceAdapters(): Provider[] {
  return [
    { provide: RendererPort, useClass: ThreeRendererAdapter },
    { provide: InputPort, useClass: DeviceInputAdapter },
    { provide: GameLoopPort, useClass: RafGameLoop },
    { provide: AudioPort, useClass: WebAudioAdapter },
  ];
}
