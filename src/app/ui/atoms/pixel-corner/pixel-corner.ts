import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Celdas de la esquina en escalera (columna desde la derecha, fila desde arriba). */
const CELLS: readonly { col: number; row: number }[] = [
  { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
  { col: 0, row: 1 }, { col: 1, row: 1 },
  { col: 0, row: 2 },
];

/** Hacia dónde se va cada píxel al caer (px) y cuánto gira (°); se repite si hay más celdas. */
const FLIGHT = [
  [26, -22, 70], [14, -30, -110], [4, -26, 140],
  [30, -8, -80], [18, -14, 100], [32, 4, -140],
];

/**
 * Esquina de píxeles de los botones (Neon Coast): la esquina de arriba a la derecha del botón está
 * hecha de píxeles en escalera. Cada cierto tiempo se despegan, caen hacia dentro de la pantalla
 * (se hunden con perspectiva, giran y se apagan) y vuelven a su sitio. Va dentro de la forma
 * inclinada del botón, que recorta su fondo con la misma escalera (`--rd-px-cell`).
 * Colores: `--rd-px-a` y `--rd-px-b` del botón. Con «Reducir movimiento», quietos.
 */
@Component({
  selector: 'rd-pixel-corner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[style.--rd-px-phase]': 'phase' },
  template: `
    @for (c of cells; track $index) {
      <!-- Hueco del píxel: queda tenue mientras el píxel está fuera, así la esquina nunca falta -->
      <s [style.right.px]="c.col * cell()" [style.top.px]="c.row * cell()"></s>
      <i
        [class.b]="$index % 3 === 1"
        [style.right.px]="c.col * cell()"
        [style.top.px]="c.row * cell()"
        [style.--x.px]="flight[$index][0]"
        [style.--y.px]="flight[$index][1]"
        [style.--r.deg]="flight[$index][2]"
        [style.--i]="c.col + c.row"
      ></i>
    }
  `,
  styles: `
    :host {
      position: absolute;
      top: 0;
      right: 0;
      width: calc(var(--rd-px-cell) * 3);
      height: calc(var(--rd-px-cell) * 3);
      pointer-events: none;
      perspective: 160px;
      perspective-origin: 0 100%;
    }
    s {
      position: absolute;
      width: calc(var(--rd-px-cell) - 1.5px);
      height: calc(var(--rd-px-cell) - 1.5px);
      background: var(--rd-px-base, color-mix(in srgb, var(--rd-px-a) 30%, var(--rd-asphalt)));
    }
    i {
      position: absolute;
      /* Hueco de 1,5 px entre píxeles: se ve la rejilla */
      width: calc(var(--rd-px-cell) - 1.5px);
      height: calc(var(--rd-px-cell) - 1.5px);
      background: var(--rd-px-a);
      box-shadow: 0 0 6px color-mix(in srgb, var(--rd-px-a) 70%, transparent);
      animation: rd-px-fall 4.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
      /* Primero se va la punta de la esquina; el resto la sigue */
      animation-delay: calc(var(--rd-px-phase, 0s) + var(--i) * 0.16s);
    }
    i.b {
      background: var(--rd-px-b);
      box-shadow: 0 0 6px color-mix(in srgb, var(--rd-px-b) 70%, transparent);
    }
    @keyframes rd-px-fall {
      0%,
      34% {
        transform: none;
        opacity: 1;
      }
      56%,
      68% {
        transform: translate3d(var(--x), var(--y), -340px) rotate(var(--r));
        opacity: 0;
      }
      90%,
      100% {
        transform: none;
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      i {
        animation: none;
      }
    }
  `,
})
export class PixelCorner {
  /** Lado de cada píxel (px): el mismo que `--rd-px-cell` del botón. */
  readonly cell = input(8);
  protected readonly cells = CELLS;
  protected readonly flight = FLIGHT;
  /** Cada botón empieza en un momento distinto: no se deshacen todos a la vez. */
  protected readonly phase = `${(-Math.random() * 4.2).toFixed(2)}s`;
}
