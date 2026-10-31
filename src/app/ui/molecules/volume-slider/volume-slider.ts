import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { toPercent } from '../../../core/domain/settings/volume';

/** Slider de volumen (0-100 %). `changed` mientras se mueve; `released` al soltarlo. */
@Component({
  selector: 'rd-volume-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="head">
      <label [attr.for]="inputId()">{{ label() }}</label>
      <span class="value">{{ percent() }} %</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      step="5"
      [id]="inputId()"
      [value]="percent()"
      (input)="changed.emit(read($event))"
      (change)="released.emit(read($event))"
    />
  `,
  styles: `
    :host {
      display: grid;
      gap: 2px;
    }
    .head {
      display: flex;
      justify-content: space-between;
    }
    .value {
      color: var(--rd-muted);
      font-variant-numeric: tabular-nums;
    }
    input {
      width: 100%;
      height: 32px;
      margin: 0;
      accent-color: var(--rd-signal);
    }
  `,
})
export class VolumeSlider {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  /** De 0 a 1. */
  readonly value = input.required<number>();
  readonly changed = output<number>();
  readonly released = output<number>();

  protected readonly percent = computed(() => toPercent(this.value()));

  protected read(event: Event): number {
    return Number((event.target as HTMLInputElement).value) / 100;
  }
}
