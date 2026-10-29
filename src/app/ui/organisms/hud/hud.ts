import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CAR_TUNING } from '../../../core/domain/car/car-tuning';
import { RaceViewState } from '../../../core/application/use-cases/race-session';
import { formatDelta, formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Stat } from '../../atoms/stat/stat';

/** Factor arcade para mostrar la velocidad en km/h. */
const KMH_FACTOR = 9;

@Component({
  selector: 'rd-hud',
  imports: [Stat, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hud.html',
  styleUrl: './hud.scss',
})
export class Hud {
  readonly state = input.required<RaceViewState>();
  readonly mapName = input('');
  readonly exit = output<void>();

  protected readonly time = computed(() => formatTime(this.state().time));
  protected readonly best = computed(() => {
    const b = this.state().bestTime;
    return b === null ? '–:––.––' : formatTime(b);
  });
  protected readonly ghost = computed(() => {
    const d = this.state().ghostDelta;
    return d === null
      ? null
      : ({ label: formatDelta(d), tone: d <= 0 ? 'ahead' : 'behind' } as const);
  });
  protected readonly speedPct = computed(() =>
    Math.round((this.state().speed / CAR_TUNING.maxSpeed) * 100),
  );
  protected readonly kmh = computed(() =>
    String(Math.round(this.state().speed * KMH_FACTOR)).padStart(3, '0'),
  );
}
