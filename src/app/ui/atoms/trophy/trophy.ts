import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Trophy as TrophyKind } from '../../../core/domain/daily/daily-map';

/** Copa de oro, plata o bronce. */
@Component({
  selector: 'rd-trophy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
      <path class="cup" d="M7 3h10v6a5 5 0 0 1-10 0z" />
      <path class="handle" d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
      <path class="cup" d="M10.5 14h3v3h-3zM8 20h8v-2H8z" />
    </svg>
  `,
  host: { '[class]': 'kind()' },
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
    }
    .cup {
      fill: var(--ink);
    }
    .handle {
      fill: none;
      stroke: var(--ink);
      stroke-width: 2;
      stroke-linecap: round;
    }
    :host(.gold) {
      --ink: #f6c344;
    }
    :host(.silver) {
      --ink: #c9d1da;
    }
    :host(.bronze) {
      --ink: #d08a4e;
    }
  `,
})
export class Trophy {
  readonly kind = input.required<TrophyKind>();
  readonly size = input(24);
}
