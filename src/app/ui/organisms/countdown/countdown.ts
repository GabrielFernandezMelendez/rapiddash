import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CountdownLight, RacePhase } from '../../../core/domain/race/race';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { TrafficLight } from '../../molecules/traffic-light/traffic-light';

/** Semáforo durante la cuenta atrás y "GO" al ponerse en verde. */
@Component({
  selector: 'rd-countdown',
  imports: [TrafficLight, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (phase() === 'countdown') {
      <rd-traffic-light [light]="light()" />
      <p class="hint">
        <span>{{ 'race.hint.touch' | t }}</span>
        <span>{{ 'race.hint.keys' | t }}</span>
      </p>
    } @else if (showGo()) {
      <rd-traffic-light light="green" class="leaving" />
      <span class="go">{{ 'race.go' | t }}</span>
    }
  `,
  styleUrl: './countdown.scss',
})
export class Countdown {
  readonly phase = input.required<RacePhase>();
  readonly light = input.required<CountdownLight>();
  readonly showGo = input(false);
}
