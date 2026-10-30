import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CountdownLight } from '../../../core/domain/race/race';
import { Lamp } from '../../atoms/lamp/lamp';

/** Semáforo de salida: rojo → amarillo → verde. */
@Component({
  selector: 'rd-traffic-light',
  imports: [Lamp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-lamp color="red" [on]="light() === 'red'" />
    <rd-lamp color="yellow" [on]="light() === 'yellow'" />
    <rd-lamp color="green" [on]="light() === 'green'" />
  `,
  host: { role: 'img', '[attr.aria-label]': 'light()' },
  styles: `
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border-radius: 18px;
      background: #0e1013;
      box-shadow:
        0 0 0 3px #2b3038,
        0 18px 40px rgb(0 0 0 / 0.45);
    }
  `,
})
export class TrafficLight {
  readonly light = input.required<CountdownLight>();
}
