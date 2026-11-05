import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CarProfile, carLook, fxAccent } from '../../../core/domain/garage/car-looks';
import { Prize } from '../../../core/domain/garage/garage';

const WHEEL_X = [-0.86, 0.86];

/** De perfil en metros a puntos de SVG (la y crece hacia abajo). */
const points = (profile: CarProfile) => profile.map(([x, y]) => `${x},${-y}`).join(' ');

const star = (x: number, y: number, r: number) => {
  const c = r * 0.25;
  return `M${x} ${y - r}L${x + c} ${y - c}L${x + r} ${y}L${x + c} ${y + c}L${x} ${y + r}L${x - c} ${y + c}L${x - r} ${y}L${x - c} ${y - c}Z`;
};
const bar = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}Z`;
const ribbon = (y: number, h: number) =>
  `M-1.3 ${y}C-.7 ${y - 0.55} -.3 ${y + 0.55} .2 ${y}S1 ${y - 0.45} 1.3 ${y}V${y + h}` +
  `C1 ${y + h - 0.45} .7 ${y + h + 0.1} .2 ${y + h}S-.7 ${y + h - 0.55} -1.3 ${y + h}Z`;
const circle = (x: number, y: number, r: number) =>
  `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** Silueta de cada efecto al acelerar, en el mismo espacio que los coches. */
const FX_SHAPES: Readonly<Record<number, string>> = {
  1: circle(-0.5, -0.45, 0.42) + circle(0.25, -0.65, 0.3) + circle(0.8, -0.8, 0.18),
  2: star(-0.5, -0.55, 0.55) + star(0.4, -0.85, 0.32) + star(0.6, -0.2, 0.38),
  3: ribbon(-0.7, 0.42),
  4: ribbon(-0.98, 0.28) + ribbon(-0.38, 0.28),
  5: bar(-1, -1.15, 0.1, 1.35) + 'M-.9 -1.1C-.4 -1.3 0 -.85 .95 -1.05V-.35C0 -.15 -.4 -.6 -.9 -.4Z',
  6: bar(-1.1, -0.7, 0.3, 0.9) + bar(-0.6, -0.95, 0.3, 1.15) + bar(-0.1, -1.15, 0.3, 1.35) +
    bar(0.4, -0.95, 0.3, 1.15) + bar(0.9, -0.7, 0.3, 0.9),
  // Con `evenodd`, los ojos y la sonrisa quedan como huecos
  7: circle(0, -0.48, 0.66) + circle(-0.24, -0.66, 0.1) + circle(0.24, -0.66, 0.1) +
    'M-.36 -.34Q0 .02 .36 -.34Q0 -.14 -.36 -.34Z',
  8: 'M-1.3 -.02C-.6 -.02 -.2 -.5 .5 -.55V-.4C-.1 -.35 -.5 .14 -1.3 .14Z' +
    'M-1.3 -.52C-.6 -.52 -.2 -1 .5 -1.05V-.9C-.1 -.85 -.5 -.36 -1.3 -.36Z' +
    circle(0.9, -0.72, 0.32),
  9: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [3, 1], [1, 2], [2, 2], [4, 2], [3, 3], [5, 3], [5, 1]]
    .map(([col, row]) => bar(-1.2 + col * 0.4, -1.05 + row * 0.32, 0.26, 0.26))
    .join(''),
  10: 'M.25 -1.2L-.55 -.4H-.05L-.35 .2L.55 -.65H.05Z',
};

/**
 * Dibujo de un premio del cubo azul: un coche de perfil o el símbolo de un efecto.
 * Sin `painted`, la silueta oscura con borde de neón; con él, ya con sus colores.
 */
@Component({
  selector: 'rd-prize-art',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="-1.85 -1.25 3.7 1.6" aria-hidden="true">
      @if (fxPath(); as path) {
        <path
          class="shape"
          fill-rule="evenodd"
          [attr.d]="path"
          [style.fill]="painted() ? fxColor() : null"
          [style.stroke]="painted() ? '#fff' : null"
        />
      } @else if (car(); as look) {
        @if (painted()) {
          <ellipse cx="0" cy="-.02" rx="1.6" ry=".1" opacity=".45" [style.fill]="look.accent" />
        }
        <polygon
          class="shape"
          [attr.points]="look.body"
          [style.fill]="painted() ? look.paint : null"
          [style.stroke]="painted() ? look.accent : null"
        />
        @if (painted()) {
          <polygon class="glass" [attr.points]="look.glass" [style.stroke]="look.accent" />
        }
        @for (x of wheelX; track x) {
          <circle
            class="shape"
            cy="-.28"
            r=".29"
            [attr.cx]="x"
            [style.fill]="painted() ? '#0a0414' : null"
            [style.stroke]="painted() ? '#000' : null"
          />
          @if (painted()) {
            <circle class="rim" cy="-.28" r=".14" [attr.cx]="x" [style.stroke]="look.accent" />
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .shape {
      fill: var(--rd-asphalt);
      stroke: var(--rd-prize-edge, var(--rd-neon-cyan));
      stroke-width: 0.035;
      stroke-linejoin: round;
    }
    .glass {
      fill: var(--rd-asphalt-2);
      stroke-width: 0.02;
    }
    .rim {
      fill: none;
      stroke-width: 0.04;
    }
  `,
})
export class PrizeArt {
  readonly prize = input.required<Prize>();
  readonly painted = input(false);
  protected readonly wheelX = WHEEL_X;

  protected readonly fxPath = computed(() => {
    const prize = this.prize();
    return prize.kind === 'fx' ? (FX_SHAPES[prize.id] ?? FX_SHAPES[1]) : null;
  });
  protected readonly fxColor = computed(() => fxAccent(this.prize().id));
  protected readonly car = computed(() => {
    const prize = this.prize();
    if (prize.kind !== 'car') return null;
    const look = carLook(prize.id);
    return {
      body: points(look.profile),
      glass: points(look.glass),
      paint: look.body,
      accent: look.accent,
    };
  });
}
