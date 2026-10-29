import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Etiqueta pequeña + valor, para el HUD y los resultados. */
@Component({
  selector: 'rd-stat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="label">{{ label() }}</span
    ><span class="value">{{ value() }}</span>`,
  host: { '[class]': "'tone-' + tone()" },
  styles: `
    :host {
      display: inline-flex;
      gap: 6px;
      align-items: baseline;
      font-family: var(--rd-font-display);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.05em;
    }
    .label {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .value {
      font-size: 15px;
    }
    :host(.tone-ghost) .value {
      color: var(--rd-ghost);
    }
    :host(.tone-ahead) .value {
      color: var(--rd-go);
    }
    :host(.tone-behind) .value {
      color: var(--rd-kerb);
    }
  `,
})
export class Stat {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly tone = input<'default' | 'ghost' | 'ahead' | 'behind'>('default');
}
