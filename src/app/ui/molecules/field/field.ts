import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FieldTone = 'neutral' | 'ok' | 'error';

/**
 * Campo de formulario: etiqueta, control proyectado y pista debajo.
 * Huecos: el control (por defecto) y [field-end] a la derecha de la etiqueta.
 */
@Component({
  selector: 'rd-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <label [attr.for]="for()">{{ label() }}</label>
      <ng-content select="[field-end]" />
    </div>
    <ng-content />
    @if (hint()) {
      <span class="hint" [class]="'hint ' + tone()" [attr.role]="tone() === 'error' ? 'alert' : null">
        {{ tone() === 'ok' ? '✓ ' : '' }}{{ hint() }}
      </span>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
    }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    label {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--rd-muted);
    }
    .hint {
      font-size: 13px;
      line-height: 1.35;
      color: var(--rd-muted);
    }
    .hint.ok {
      color: var(--rd-go);
    }
    .hint.error {
      color: var(--rd-kerb);
      filter: brightness(1.25);
    }
  `,
})
export class Field {
  readonly label = input.required<string>();
  readonly for = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly tone = input<FieldTone>('neutral');
}
