import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PixelCorner } from '../pixel-corner/pixel-corner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'light' | 'link';

/**
 * Botón base. Uso: <button rdButton variant="secondary">…</button>
 * El principal y el secundario son paralelogramos synthwave (forma inclinada detrás del texto)
 * con la esquina de arriba a la derecha hecha de píxeles que se deshacen y vuelven.
 */
@Component({
  selector: 'button[rdButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PixelCorner],
  template: `
    @if (shaped()) {
      <span class="shape" aria-hidden="true">
        <span class="fill"></span>
        <rd-pixel-corner [cell]="cell()" />
      </span>
    }
    <ng-content />
  `,
  host: {
    class: 'rd-button',
    '[class.rd-button--primary]': "variant() === 'primary'",
    '[class.rd-button--secondary]': "variant() === 'secondary'",
    '[class.rd-button--ghost]': "variant() === 'ghost'",
    '[class.rd-button--light]': "variant() === 'light'",
    '[class.rd-button--link]': "variant() === 'link'",
    '[class.rd-button--block]': 'block()',
    '[style.--rd-px-cell.px]': 'cell()',
  },
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly block = input(false);
  protected readonly shaped = computed(() => this.variant() === 'primary' || this.variant() === 'secondary');
  protected readonly cell = computed(() => (this.variant() === 'primary' ? 8 : 7));
}
