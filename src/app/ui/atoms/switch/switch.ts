import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Interruptor de sí/no. Uso: <rd-switch [on]="x" [label]="'…'" (toggled)="…" /> */
@Component({
  selector: 'rd-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" role="switch" [attr.aria-checked]="on()" (click)="toggled.emit(!on())">
      <span class="text">
        <b>{{ label() }}</b>
        @if (hint()) {
          <small>{{ hint() }}</small>
        }
      </span>
      <span class="track" aria-hidden="true"><span class="knob"></span></span>
    </button>
  `,
  styles: `
    button {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 4px 0;
      border: 0;
      background: none;
      color: var(--rd-chalk);
      text-align: left;
      cursor: pointer;
    }
    .text {
      display: grid;
      flex: 1;
      gap: 2px;
    }
    b {
      font-weight: 600;
    }
    small {
      font-size: 12px;
      color: var(--rd-muted);
    }
    .track {
      position: relative;
      flex: none;
      width: 52px;
      height: 26px;
      transform: skewX(var(--rd-skew));
      border-radius: 4px;
      background: color-mix(in srgb, var(--rd-violet) 70%, black);
      box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--rd-magenta) 45%, transparent);
      transition: background 0.2s, box-shadow 0.2s;
    }
    .knob {
      position: absolute;
      top: 4px;
      left: 4px;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      background: var(--rd-muted);
      transition: transform 0.3s cubic-bezier(0.2, 1.6, 0.4, 1), background 0.2s, box-shadow 0.2s;
    }
    [aria-checked='true'] .track {
      background: color-mix(in srgb, var(--rd-neon-cyan) 22%, var(--rd-asphalt));
      box-shadow: inset 0 0 0 1.5px var(--rd-neon-cyan), 0 0 10px color-mix(in srgb, var(--rd-neon-cyan) 45%, transparent);
    }
    [aria-checked='true'] .knob {
      transform: translateX(26px);
      background: var(--rd-neon-cyan);
      box-shadow: 0 0 8px var(--rd-neon-cyan);
    }
  `,
})
export class Switch {
  readonly on = input.required<boolean>();
  readonly label = input.required<string>();
  readonly hint = input('');
  readonly toggled = output<boolean>();
}
