import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LEADERBOARD_SIZE, LeaderboardEntry } from '../../../core/domain/race/leaderboard';
import { formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';

interface Row {
  readonly position: number;
  readonly name: string;
  readonly time: string;
  readonly empty: boolean;
}

/** Siempre muestra 10 puestos; los vacíos aparecen como huecos. */
@Component({
  selector: 'rd-leaderboard',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>{{ 'leaderboard.title' | t }}</h3>
    <ol>
      @for (row of rows(); track row.position) {
        <li [class.empty]="row.empty">
          <span class="pos">{{ row.position }}</span>
          <span class="name">{{ row.name }}</span>
          <span class="time">{{ row.time }}</span>
        </li>
      }
    </ol>
    @if (entries().length === 0) {
      <p class="note">{{ 'leaderboard.empty' | t }}</p>
    }
  `,
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  readonly entries = input<readonly LeaderboardEntry[]>([]);

  protected readonly rows = computed<Row[]>(() =>
    Array.from({ length: LEADERBOARD_SIZE }, (_, i) => {
      const entry = this.entries()[i];
      return entry
        ? { position: i + 1, name: entry.playerName, time: formatTime(entry.time), empty: false }
        : { position: i + 1, name: '———', time: '–:––.––', empty: true };
    }),
  );
}
