import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Tres marcas de bordillo; las encendidas indican la dificultad. */
@Component({
  selector: 'rd-difficulty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (n of levels; track n) {
      <i [class.on]="n <= level()"></i>
    }
  `,
  host: { '[attr.aria-label]': 'level() + "/3"' },
  styles: `
    :host {
      display: inline-flex;
      gap: 3px;
    }
    i {
      width: 14px;
      height: 6px;
      border-radius: 2px;
      background: var(--rd-line);
    }
    i.on {
      background: var(--rd-kerb);
    }
  `,
})
export class Difficulty {
  readonly level = input.required<number>();
  protected readonly levels = [1, 2, 3];
}
