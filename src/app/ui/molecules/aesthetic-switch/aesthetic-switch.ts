import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Aesthetic, AESTHETICS } from '../../../core/domain/settings/aesthetic';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';

/** Selector de estética con una miniatura de cada una. */
@Component({
  selector: 'rd-aesthetic-switch',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (a of aesthetics; track a) {
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="a === value()"
        [class.active]="a === value()"
        (click)="changed.emit(a)"
      >
        <span class="swatch" [class]="'swatch ' + a" aria-hidden="true"></span>
        {{ 'aesthetic.' + a | t }}
      </button>
    }
  `,
  host: { role: 'radiogroup' },
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
    button {
      display: grid;
      justify-items: center;
      gap: 6px;
      padding: 8px 6px 10px;
      border: 0;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-muted);
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
    }
    button.active {
      color: var(--rd-chalk);
      box-shadow:
        inset 0 0 0 2px var(--rd-signal),
        0 0 14px rgb(255 211 25 / 0.25);
    }
    .swatch {
      display: block;
      width: 100%;
      height: 38px;
      border-radius: 7px;
    }
    .classic {
      background: linear-gradient(#bfe1dc 0 45%, #86b46b 45% 60%, #3d424b 60%);
    }
    .retro {
      background:
        radial-gradient(circle at 50% 62%, #ffd319 0 22%, transparent 23%),
        linear-gradient(#25094a, #ff2a6d 60%, #140630 61%);
    }
    .futurist {
      background:
        linear-gradient(transparent 61%, #2de2e6 61% 64%, transparent 64%),
        radial-gradient(circle at 50% 62%, #e9f7ff 0 22%, transparent 23%),
        linear-gradient(#0d0420, #3a2a9a 60%, #140630 61%);
    }
  `,
})
export class AestheticSwitch {
  readonly value = input.required<Aesthetic>();
  readonly changed = output<Aesthetic>();
  protected readonly aesthetics = AESTHETICS;
}
