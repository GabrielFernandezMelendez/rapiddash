import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Medal } from '../../../core/domain/medals/medals';

/**
 * Medalla dibujada con CSS: moneda con cinta, relieve y un brillo que la cruza. Sin medalla,
 * hueco apagado. `fresh` la hace entrar con un golpe y una explosión de chispas (medalla nueva).
 */
@Component({
  selector: 'rd-medal-coin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-medal]': "medal() ?? 'none'",
    '[class.fresh]': 'fresh()',
    '[style.--size.px]': 'size()',
  },
  template: `
    <span class="ribbon" aria-hidden="true"></span>
    <span class="coin" aria-hidden="true"><span class="star">★</span><i class="shine"></i></span>
    @if (fresh()) {
      <span class="burst" aria-hidden="true">
        @for (i of sparks; track i) {
          <i [style.--a]="i * 30 + 'deg'"></i>
        }
      </span>
    }
  `,
  styles: `
    :host {
      --size: 44px;
      position: relative;
      display: inline-grid;
      justify-items: center;
      width: var(--size);
      height: calc(var(--size) * 1.25);
      --c: #5a4a80;
      --c2: #2a1a4a;
      --c3: #3a2a60;
    }
    :host([data-medal='bronze']) { --c: #f0a066; --c2: #8a4a1e; --c3: #c06a30; }
    :host([data-medal='silver']) { --c: #ffffff; --c2: #8a97ad; --c3: #c9d3e0; }
    :host([data-medal='gold']) { --c: #fff07a; --c2: #c96a00; --c3: #ffc21a; }
    :host([data-medal='platinum']) { --c: #eaffff; --c2: #5a3cff; --c3: #7ff6ff; }
    .ribbon {
      position: absolute;
      top: 0;
      width: 55%;
      height: 45%;
      background: linear-gradient(90deg, #ff2a6d 0 50%, #2de2e6 50%);
      clip-path: polygon(0 0, 100% 0, 80% 100%, 50% 80%, 20% 100%);
      opacity: 0.9;
    }
    :host([data-medal='none']) .ribbon { opacity: 0.25; }
    .coin {
      position: absolute;
      bottom: 0;
      display: grid;
      place-items: center;
      width: var(--size);
      height: var(--size);
      border-radius: 50%;
      overflow: hidden;
      background: radial-gradient(circle at 35% 30%, var(--c) 0 18%, var(--c3) 45%, var(--c2) 100%);
      box-shadow:
        inset 0 0 0 calc(var(--size) * 0.07) color-mix(in srgb, var(--c2) 70%, #000),
        inset 0 calc(var(--size) * 0.05) 0 rgb(255 255 255 / 0.35),
        0 0 calc(var(--size) * 0.35) color-mix(in srgb, var(--c3) 55%, transparent);
    }
    :host([data-medal='none']) .coin {
      background: rgb(20 7 46 / 0.6);
      box-shadow: inset 0 0 0 2px rgb(244 236 255 / 0.18);
    }
    :host([data-medal='platinum']) .coin {
      background:
        conic-gradient(from 0deg, #7ff6ff, #ff4fd8, #ffd319, #5dff9a, #7ff6ff) border-box,
        radial-gradient(circle at 35% 30%, #fff 0 18%, #7ff6ff 50%, #5a3cff);
      background-blend-mode: soft-light;
      animation: spin-hue 4s linear infinite;
    }
    .star {
      font-size: calc(var(--size) * 0.46);
      line-height: 1;
      color: color-mix(in srgb, var(--c2) 80%, #000);
      text-shadow: 0 1px 0 rgb(255 255 255 / 0.4);
    }
    :host([data-medal='none']) .star { color: rgb(244 236 255 / 0.2); text-shadow: none; }
    .shine {
      position: absolute;
      inset: 0;
      background: linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.8) 50%, transparent 65%);
      animation: shine 3.2s ease-in-out infinite;
    }
    :host([data-medal='none']) .shine { display: none; }
    :host(.fresh) .coin { animation: slam 0.7s cubic-bezier(0.2, 1.7, 0.4, 1) both; }
    .burst {
      position: absolute;
      bottom: calc(var(--size) / 2);
      left: 50%;
    }
    .burst i {
      position: absolute;
      width: 6px;
      height: 6px;
      margin: -3px;
      border-radius: 50%;
      background: var(--c3);
      box-shadow: 0 0 8px var(--c);
      animation: burst 0.9s 0.15s cubic-bezier(0.1, 0.7, 0.3, 1) both;
    }
    @keyframes shine {
      0% { translate: -120% 0; }
      45%, 100% { translate: 120% 0; }
    }
    @keyframes slam {
      0% { scale: 2.4; opacity: 0; rotate: -30deg; }
      60% { scale: 0.9; opacity: 1; rotate: 6deg; }
      100% { scale: 1; rotate: 0deg; }
    }
    @keyframes burst {
      from { transform: rotate(var(--a)) translateY(0) scale(1); opacity: 1; }
      to { transform: rotate(var(--a)) translateY(calc(var(--size) * -1.3)) scale(0.2); opacity: 0; }
    }
    @keyframes spin-hue {
      to { filter: hue-rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
      .shine, .burst, :host(.fresh) .coin, :host([data-medal='platinum']) .coin { animation: none; }
    }
  `,
})
export class MedalCoin {
  readonly medal = input<Medal | null>(null);
  readonly size = input(44);
  readonly fresh = input(false);
  protected readonly sparks = Array.from({ length: 12 }, (_, i) => i);
}
