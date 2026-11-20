import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PixelCorner } from '../../atoms/pixel-corner/pixel-corner';

/**
 * Botón grande de un modo de juego en el menú (mapa del día, torneos).
 * Huecos: [mode-icon] a la izquierda y [mode-badge] a la derecha.
 * Tarjeta inclinada (Neon Coast) con la esquina de píxeles, como los botones.
 */
@Component({
  selector: 'rd-mode-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PixelCorner],
  template: `
    <button type="button" [class.highlight]="highlight()" (click)="pressed.emit()">
      <span class="shape" aria-hidden="true">
        <span class="fill"></span>
        <rd-pixel-corner [cell]="7" />
      </span>
      <span class="icon"><ng-content select="[mode-icon]" /></span>
      <span class="text">
        <span class="title">{{ title() }}</span>
        <span class="subtitle">{{ subtitle() }}</span>
      </span>
      <span class="badge"><ng-content select="[mode-badge]" /></span>
    </button>
  `,
  styles: `
    :host {
      display: block;
      padding-inline: 8px;
    }
    button {
      --ring: var(--rd-neon-cyan);
      --rd-px-cell: 7px;
      --rd-px-a: var(--ring);
      --rd-px-b: var(--rd-neon-pink);
      position: relative;
      isolation: isolate;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 62px;
      padding: 0 18px;
      border: 0;
      background: none;
      color: var(--rd-chalk);
      text-align: left;
      cursor: pointer;
      transition: transform 0.25s cubic-bezier(0.2, 1.6, 0.4, 1);
    }
    button:active {
      transform: scale(0.97);
    }
    button.highlight {
      --ring: var(--rd-neon-pink);
      --rd-px-b: var(--rd-signal);
    }
    .shape {
      position: absolute;
      inset: 0;
      z-index: -1;
      transform: skewX(var(--rd-skew));
      filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ring) 40%, transparent));
      pointer-events: none;
    }
    .fill {
      --c: var(--rd-px-cell);
      position: absolute;
      inset: 0;
      border-radius: 6px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--rd-violet) 80%, var(--rd-asphalt)), color-mix(in srgb, var(--rd-asphalt) 90%, transparent));
      box-shadow: inset 0 0 0 2px var(--ring), inset 0 0 18px color-mix(in srgb, var(--ring) 30%, transparent);
      clip-path: polygon(0 0, calc(100% - var(--c) * 3) 0, calc(100% - var(--c) * 3) var(--c), calc(100% - var(--c) * 2) var(--c),
        calc(100% - var(--c) * 2) calc(var(--c) * 2), calc(100% - var(--c)) calc(var(--c) * 2), calc(100% - var(--c)) calc(var(--c) * 3),
        100% calc(var(--c) * 3), 100% 100%, 0 100%);
    }
    .icon {
      display: inline-grid;
      flex: none;
      color: var(--rd-ghost);
    }
    .text {
      display: grid;
      gap: 1px;
      flex: 1;
      min-width: 0;
    }
    .title {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 20px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .subtitle {
      font-size: 13px;
      color: var(--rd-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex: none;
    }
  `,
})
export class ModeButton {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly highlight = input(false);
  readonly pressed = output<void>();
}
