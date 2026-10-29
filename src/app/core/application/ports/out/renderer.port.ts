import { CarPose } from '../../../domain/race/ghost';
import { MapTheme } from '../../../domain/track/race-map';
import { Track } from '../../../domain/track/track';

export interface RenderFrame {
  readonly car: CarPose & { readonly accelerating: boolean; readonly crashed: boolean };
  readonly ghost: CarPose | null;
}

/**
 * Puerto de salida para dibujar la carrera.
 * Se usan clases abstractas como puertos: sirven de token de inyección en Angular
 * sin que el núcleo dependa del framework.
 */
export abstract class RendererPort {
  abstract attach(host: HTMLElement, track: Track, theme: MapTheme): void;
  abstract render(frame: RenderFrame, dt: number): void;
  /** Sacude la cámara (choques). */
  abstract impact(): void;
  abstract dispose(): void;
}
