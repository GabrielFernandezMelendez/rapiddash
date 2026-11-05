import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StandingRow, TOURNAMENT_DAYS } from '../../../core/domain/tournament/tournament';
import { formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Flag } from '../../atoms/flag/flag';
import { mapMedalTargets } from '../../../core/domain/medals/map-medals';
import { Medal, medalFor } from '../../../core/domain/medals/medals';
import { findMap } from '../../../core/domain/track/race-map';

/**
 * Clasificación del torneo: puntos de cada día, total y, al lado, el tiempo del día que se juega
 * (o del último, si ya acabó) como una métrica más. Cada fila, del color de la liga que da ese
 * tiempo en el circuito de ese día (como en el top 10 del mapa del día); mi fila, más intensa.
 */
@Component({
  selector: 'rd-standings-table',
  imports: [Flag, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row head" [style.grid-template-columns]="columns()">
      <span></span><span>{{ 'tournament.driver' | t }}</span>
      @for (d of shownDays(); track d) {
        <span class="num">{{ 'tournament.dayShort' | t }}{{ d + 1 }}</span>
      }
      <span class="num">{{ 'tournament.total' | t }}</span>
      <span class="num">{{ 'tournament.time' | t }}</span>
    </div>
    <ol>
      @for (row of rows(); track row.member.uid; let i = $index) {
        <li
          class="row"
          [class.me]="row.member.uid === myUid()"
          [attr.data-medal]="medalOf(row)"
          [style.grid-template-columns]="columns()"
        >
          <span class="pos" [class.first]="i === 0 && row.total > 0">{{ i + 1 }}</span>
          <span class="who"><rd-flag [country]="row.member.country" /><span>{{ row.member.nickname }}</span></span>
          @for (d of shownDays(); track d) {
            <span class="num" [class.today]="d === today()">{{ row.days[d] ?? '–' }}</span>
          }
          <b class="num total">{{ row.total }}</b>
          <span class="num time" [class.none]="!timeOf(row)">{{ timeOf(row) ?? '–' }}</span>
        </li>
      }
    </ol>
  `,
  styles: `
    :host {
      display: grid;
      gap: 6px;
    }
    ol {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: inset 0 0 0 1px var(--rd-line);
      font-variant-numeric: tabular-nums;
    }
    .row {
      display: grid;
      gap: 6px;
      align-items: center;
      padding: 0 12px;
      min-height: 34px;
    }
    li:nth-child(odd) {
      background: rgb(255 255 255 / 0.03);
    }
    li.me {
      background: color-mix(in srgb, var(--rd-signal) 14%, transparent);
      box-shadow: inset 3px 0 0 var(--rd-signal);
      font-weight: 600;
    }
    .head {
      min-height: 0;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--rd-muted);
    }
    .pos {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 16px;
      color: var(--rd-muted);
    }
    .pos.first {
      color: var(--rd-signal);
    }
    .who {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .who span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .num {
      text-align: right;
    }
    .today {
      color: var(--rd-ghost);
    }
    .time {
      font-size: 14px;
      white-space: nowrap;
    }
    .time.none {
      color: var(--rd-muted);
    }
    /* Liga de cada piloto por su tiempo del día: cápsula, apodo y tiempo en su color */
    li[data-medal] {
      --c: var(--rd-chalk);
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--c) 20%, transparent),
        color-mix(in srgb, var(--c) 6%, transparent) 65%,
        transparent
      );
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 18%, transparent);
    }
    li[data-medal] .who span,
    li[data-medal] .time {
      color: var(--c);
    }
    li[data-medal] .time {
      text-shadow: 0 0 8px color-mix(in srgb, var(--c) 45%, transparent);
    }
    li[data-medal].me {
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--c) 38%, transparent),
        color-mix(in srgb, var(--c) 14%, transparent) 70%,
        color-mix(in srgb, var(--c) 6%, transparent)
      );
      box-shadow:
        inset 3px 0 0 var(--c),
        inset 0 0 0 1px color-mix(in srgb, var(--c) 45%, transparent),
        0 0 14px color-mix(in srgb, var(--c) 30%, transparent);
    }
    li[data-medal='bronze'] { --c: var(--rd-medal-bronze); }
    li[data-medal='silver'] { --c: var(--rd-medal-silver); }
    li[data-medal='gold'] { --c: var(--rd-medal-gold); }
    li[data-medal='platinum'] { --c: var(--rd-medal-platinum); }
    .total {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-size: 18px;
    }
  `,
})
export class StandingsTable {
  readonly rows = input.required<readonly StandingRow[]>();
  readonly myUid = input<string | null>(null);
  /** Día en curso (sus puntos son provisionales). */
  readonly today = input<number | null>(null);
  /** Circuito de cada día del torneo (para los colores de liga). */
  readonly mapIds = input<readonly string[]>([]);

  protected readonly days = Array.from({ length: TOURNAMENT_DAYS }, (_, i) => i);
  /** Columnas de puntos: solo los días ya empezados (deja sitio al apodo y al tiempo). */
  protected readonly shownDays = computed(() => {
    const today = this.today();
    return today === null ? this.days : this.days.slice(0, today + 1);
  });
  /** Día cuyo tiempo se muestra: el de hoy o, con el torneo acabado, el último con tiempos. */
  protected readonly shownDay = computed(() => {
    const today = this.today();
    if (today !== null) return today;
    const withTimes = this.days.filter((d) => this.rows().some((r) => r.times[d] != null));
    return withTimes.at(-1) ?? 0;
  });
  protected readonly columns = computed(
    () => `22px minmax(0, 1fr) ${this.shownDays().map(() => '26px').join(' ')} 38px 66px`,
  );

  /** Tiempos objetivo del circuito del día que se muestra. */
  private readonly targets = computed(() => {
    const map = findMap(this.mapIds()[this.shownDay()] ?? '');
    return map ? mapMedalTargets(map) : null;
  });

  protected medalOf(row: StandingRow): Medal | null {
    const t = row.times[this.shownDay()];
    const targets = this.targets();
    return t == null || !targets ? null : medalFor(t, targets);
  }

  protected timeOf(row: StandingRow): string | null {
    const t = row.times[this.shownDay()];
    return t == null ? null : formatTime(t);
  }
}
