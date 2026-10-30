import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/** Botón base. Uso: <button rdButton variant="secondary">…</button> */
@Component({
  selector: 'button[rdButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    class: 'rd-button',
    '[class.rd-button--primary]': "variant() === 'primary'",
    '[class.rd-button--secondary]': "variant() === 'secondary'",
    '[class.rd-button--ghost]': "variant() === 'ghost'",
    '[class.rd-button--block]': 'block()',
  },
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly block = input(false);
}
