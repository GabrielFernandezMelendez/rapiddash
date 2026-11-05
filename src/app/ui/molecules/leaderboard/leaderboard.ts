import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CountryCode } from '../../../core/domain/profile/country';
import {
  LEADERBOARD_SIZE,
  nearRows,
  RankedRecord,
  RankingView,
} from '../../../core/domain/race/ranking';
import { formatTime, NO_TIME } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Flag } from '../../atoms/flag/flag';
import { Medal, medalFor, MedalTargets } from '../../../core/domain/medals/medals';
import { MedalLeague } from '../medal-league/medal-league';

interface Row {
  readonly key: string;
  readonly rank: number;
  readonly name: string;
  readonly country: CountryCode | null;
  readonly time: string;
  readonly empty: boolean;
  readonly me: boolean;
  readonly rival: boolean;
  /** Liga del piloto según su tiempo: colorea su apodo y su marca. */
  readonly medal: Medal | null;
}

/**
 * Top 10 del mapa con bandera, apodo y tiempo (los huecos se ven vacíos). Si no salgo en el
 * top, debajo van el de justo encima y yo. Mi fila en amarillo; la del rival, en el color del
 * fantasma.
 */
@Component({
  selector: 'rd-leaderboard',
  imports: [Flag, MedalLeague, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>{{ title() | t }}</h3>
    @if (targets(); as t) {
      <!-- Mi liga en este mapa y la siguiente medalla con su tiempo objetivo -->
      <rd-medal-league [targets]="t" [best]="view().me?.record?.time ?? null" />
    }
    <ol [class.loading]="loading()">
      @for (row of rows(); track row.key) {
        <li [class.empty]="row.empty" [class.me]="row.me" [class.rival]="row.rival" [attr.data-medal]="row.medal">
          <span class="pos">{{ row.rank }}</span>
          @if (!row.empty) {
            <rd-flag [country]="row.country" />
          }
          <span class="name">{{ row.name }}{{ row.me ? ' ' + ('leaderboard.you' | t) : '' }}</span>
          @if (row.rival) {
            <span class="tag">{{ 'leaderboard.rival' | t }}</span>
          }
          <span class="time">{{ row.time }}</span>
        </li>
      }
    </ol>
    @if (near().length) {
      <div class="gap" aria-hidden="true">· · ·</div>
      <ol>
        @for (row of near(); track row.key) {
          <li [class.me]="row.me" [class.rival]="row.rival" [attr.data-medal]="row.medal">
            <span class="pos">{{ row.rank }}</span>
            <rd-flag [country]="row.country" />
            <span class="name">{{ row.name }}{{ row.me ? ' ' + ('leaderboard.you' | t) : '' }}</span>
            @if (row.rival) {
              <span class="tag">{{ 'leaderboard.rival' | t }}</span>
            }
            <span class="time">{{ row.time }}</span>
          </li>
        }
      </ol>
    }
    @if (!loading() && view().top.length === 0) {
      <p class="note">{{ (offline() ? 'leaderboard.offline' : 'leaderboard.empty') | t }}</p>
    }
  `,
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  readonly view = input.required<RankingView>();
  /** Clave i18n del título («Top 10 · Mundial», «Top 10 de hoy»). */
  readonly title = input('leaderboard.title');
  readonly myUid = input<string | null>(null);
  readonly rivalUid = input<string | null>(null);
  readonly loading = input(false);
  /** No se pudo leer el ranking (sin red y sin caché). */
  readonly offline = input(false);
  /** Tiempos objetivo del mapa: cada piloto se pinta con el color de su liga (null = sin medallas). */
  readonly targets = input<MedalTargets | null>(null);

  protected readonly rows = computed<Row[]>(() =>
    Array.from({ length: LEADERBOARD_SIZE }, (_, i) => {
      const ranked = this.view().top[i];
      return ranked ? this.row(ranked) : emptyRow(i + 1);
    }),
  );

  protected readonly near = computed(() => nearRows(this.view()).map((r) => this.row(r)));

  private row({ rank, record }: RankedRecord): Row {
    return {
      key: record.uid,
      rank,
      name: record.nickname,
      country: record.country,
      time: formatTime(record.time),
      empty: false,
      me: record.uid === this.myUid(),
      rival: record.uid === this.rivalUid(),
      medal: this.targets() ? medalFor(record.time, this.targets()!) : null,
    };
  }
}

function emptyRow(rank: number): Row {
  return {
    key: `empty-${rank}`,
    rank,
    name: '———',
    country: null,
    time: NO_TIME,
    empty: true,
    me: false,
    rival: false,
    medal: null,
  };
}
