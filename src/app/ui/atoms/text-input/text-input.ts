import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Campo de texto base. Uso: <input rdInput type="email" />. */
@Component({
  selector: 'input[rdInput]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  host: {
    class: 'rd-input',
    '[class.rd-input--error]': 'invalid()',
    '[attr.aria-invalid]': 'invalid() || null',
  },
  styles: `
    :host {
      width: 100%;
      min-height: 48px;
      padding: 0 14px;
      border: 0;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt-2);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-chalk);
      font: inherit;
      font-size: 16px; /* 16 px: iOS no hace zoom al enfocar */
      outline: none;
    }
    :host::placeholder {
      color: var(--rd-muted);
      opacity: 0.7;
    }
    :host(:focus) {
      box-shadow: inset 0 0 0 2px var(--rd-signal);
    }
    :host(.rd-input--error) {
      box-shadow: inset 0 0 0 2px var(--rd-kerb);
    }
  `,
})
export class TextInput {
  readonly invalid = input(false);
}
