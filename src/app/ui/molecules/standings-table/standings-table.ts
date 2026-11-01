import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { StandingRow, TOURNAMENT_DAYS } from '../../../core/domain/tournament/tournament';
import { formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Flag } from '../../atoms/flag/flag';

/**
 * Clasificación del torneo: puntos de cada día y total, y debajo del apodo el tiempo del día que
 * se juega (o del último, si ya acabó). Mi fila, en amarillo.
 */
@Component({
  selector: 'rd-standings-table',
  imports: [Flag, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row head" [style.grid-template-columns]="columns()">
      <span></span><span>{{ 'tournament.driver' | t }}</span>
      @for (d of days; track d) {
        <span class="num">{{ 'tournament.dayShort' | t }}{{ d + 1 }}</span>
      }
      <span class="num">{{ 'tournament.total' | t }}</span>
    </div>
    <ol>
      @for (row of rows(); track row.member.uid; let i = $index) {
        <li class="row" [class.me]="row.member.uid === myUid()" [style.grid-template-columns]="columns()">
          <span class="pos" [class.first]="i === 0 && row.total > 0">{{ i + 1 }}</span>
          <span class="who">
            <rd-flag [country]="row.member.country" />
            <span class="name">
              <span>{{ row.member.nickname }}</span>
              @if (timeOf(row); as time) {
                <small>{{ 'tournament.dayShort' | t }}{{ shownDay() + 1 }} · {{ time }}</small>
              }
            </span>
          </span>
          @for (d of days; track d) {
            <span class="num" [class.today]="d === today()">{{ row.days[d] ?? '–' }}</span>
          }
          <b class="num total">{{ row.total }}</b>
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
      min-height: 40px;
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
    .name {
      display: grid;
      min-width: 0;
      line-height: 1.15;
    }
    .name span,
    .name small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .name small {
      font-size: 12px;
      font-weight: 500;
      color: var(--rd-muted);
      font-variant-numeric: tabular-nums;
    }
    .num {
      text-align: right;
    }
    .today {
      color: var(--rd-ghost);
    }
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

  protected readonly days = Array.from({ length: TOURNAMENT_DAYS }, (_, i) => i);
  /** Día cuyo tiempo se muestra: el de hoy o, con el torneo acabado, el último con tiempos. */
  protected readonly shownDay = computed(() => {
    const today = this.today();
    if (today !== null) return today;
    const withTimes = this.days.filter((d) => this.rows().some((r) => r.times[d] != null));
    return withTimes.at(-1) ?? 0;
  });
  protected readonly columns = computed(
    () => `26px minmax(0, 1fr) ${this.days.map(() => '30px').join(' ')} 40px`,
  );

  protected timeOf(row: StandingRow): string | null {
    const t = row.times[this.shownDay()];
    return t == null ? null : formatTime(t);
  }
}
