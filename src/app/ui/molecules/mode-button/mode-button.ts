import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Botón grande de un modo de juego en el menú (mapa del día, torneos).
 * Huecos: [mode-icon] a la izquierda y [mode-badge] a la derecha.
 */
@Component({
  selector: 'rd-mode-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" [class.highlight]="highlight()" (click)="pressed.emit()">
      <span class="icon"><ng-content select="[mode-icon]" /></span>
      <span class="text">
        <span class="title">{{ title() }}</span>
        <span class="subtitle">{{ subtitle() }}</span>
      </span>
      <span class="badge"><ng-content select="[mode-badge]" /></span>
    </button>
  `,
  styles: `
    button {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 62px;
      padding: 0 14px;
      border: 0;
      border-radius: 12px;
      background: color-mix(in srgb, var(--rd-asphalt-2) 92%, transparent);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-chalk);
      text-align: left;
      cursor: pointer;
    }
    button.highlight {
      box-shadow: inset 0 0 0 2px var(--rd-ghost);
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
