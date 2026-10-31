import { CarPose } from '../../../domain/race/ghost';
import { Aesthetic } from '../../../domain/settings/aesthetic';
import { BillboardContent } from '../../../domain/track/billboards';
import { MapTheme } from '../../../domain/track/race-map';
import { Track } from '../../../domain/track/track';

export interface RenderFrame {
  readonly car: CarPose & {
    readonly accelerating: boolean;
    /** Pivote automático tras chocar en un cruce. */
    readonly recovering: boolean;
    /** Lado del muro que roza (chispas): 1 derecha, -1 izquierda, 0 ninguno. */
    readonly scrapeSide: -1 | 0 | 1;
  };
  readonly ghost: CarPose | null;
  /** Etiqueta sobre el fantasma de un rival (se desvanece al empezar); null sin rival. */
  readonly ghostLabel: { readonly text: string; readonly opacity: number } | null;
}

/**
 * Puerto de salida para dibujar la carrera.
 * Se usan clases abstractas como puertos: sirven de token de inyección en Angular
 * sin que el núcleo dependa del framework.
 */
export abstract class RendererPort {
  /** `theme` es el ambiente del mapa; `aesthetic`, la estética elegida en Ajustes. */
  abstract attach(host: HTMLElement, track: Track, theme: MapTheme, aesthetic: Aesthetic): void;
  abstract render(frame: RenderFrame, dt: number): void;
  /** Sacude la cámara (choques). */
  abstract impact(): void;
  /** Golpecito al cambiar de carril contra el muro: chispas en ese lado y vibración leve. */
  abstract bump(side: 1 | -1): void;
  /** Carteles de líderes (1.º y 2.º); null los oculta. Puede llegar con la carrera ya empezada. */
  abstract setBillboards(content: BillboardContent | null): void;
  abstract dispose(): void;
}
