import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LampColor = 'red' | 'yellow' | 'green';

/** Una luz del semáforo. */
@Component({
  selector: 'rd-lamp',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
  host: {
    '[class]': "'lamp lamp--' + color()",
    '[class.on]': 'on()',
    role: 'presentation',
  },
  styles: `
    :host {
      display: block;
      width: 52px;
      aspect-ratio: 1;
      border-radius: 50%;
      background: #22262c;
      box-shadow: inset 0 3px 6px rgb(0 0 0 / 0.6);
      transition:
        background 0.12s,
        box-shadow 0.12s;
    }
    :host(.lamp--red.on) {
      background: #ff4b3e;
      box-shadow: 0 0 28px #ff4b3e;
    }
    :host(.lamp--yellow.on) {
      background: #ffc93d;
      box-shadow: 0 0 28px #ffc93d;
    }
    :host(.lamp--green.on) {
      background: #4ee07a;
      box-shadow: 0 0 28px #4ee07a;
    }
  `,
})
export class Lamp {
  readonly color = input.required<LampColor>();
  readonly on = input(false);
}
