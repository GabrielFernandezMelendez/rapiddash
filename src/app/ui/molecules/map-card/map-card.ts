import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RaceMap } from '../../../core/domain/track/race-map';
import { formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Difficulty } from '../../atoms/difficulty/difficulty';

/** Tarjeta de mapa en la pantalla de selección. */
@Component({
  selector: 'rd-map-card',
  imports: [Difficulty, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="card"
      [class]="'theme-' + map().theme"
      (click)="choose.emit(map())"
    >
      <span class="art" aria-hidden="true"></span>
      <span class="info">
        <span class="name">{{ map().nameKey | t }}</span>
        <span class="meta">
          <rd-difficulty [level]="map().difficulty" />
          <span>{{ 'difficulty.' + map().difficulty | t }}</span>
        </span>
        <span class="best">
          {{ 'maps.best' | t }} · <b>{{ bestLabel() ?? ('maps.noBest' | t) }}</b>
        </span>
      </span>
    </button>
  `,
  styleUrl: './map-card.scss',
})
export class MapCard {
  readonly map = input.required<RaceMap>();
  readonly bestTime = input<number | null>(null);
  readonly choose = output<RaceMap>();

  protected readonly bestLabel = computed(() => {
    const t = this.bestTime();
    return t === null ? null : formatTime(t);
  });
}
