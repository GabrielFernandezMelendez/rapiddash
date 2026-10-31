import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CountryCode } from '../../../core/domain/profile/country';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Flag } from '../../atoms/flag/flag';

export interface DayCard {
  readonly label: string;
  /** Clave i18n del nombre del mapa; null si aún no se ha desvelado. */
  readonly mapKey: string | null;
  readonly state: 'done' | 'today' | 'future';
  /** Ganador de un día terminado. */
  readonly winner: { readonly nickname: string; readonly country: CountryCode | null } | null;
}

/** Los 3 días del torneo: terminados con su ganador, el de hoy y los que faltan. */
@Component({
  selector: 'rd-day-cards',
  imports: [Flag, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (d of days(); track d.label) {
      <div class="day" [class]="'day ' + d.state">
        <span class="label">{{ d.label }}</span>
        <b>{{ d.mapKey ? (d.mapKey | t) : '¿?' }}</b>
        @if (d.winner; as w) {
          <span class="winner"><rd-flag [country]="w.country" /> {{ w.nickname }}</span>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    .day {
      display: grid;
      align-content: start;
      gap: 3px;
      min-width: 0;
      padding: 8px 10px;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt-2);
      box-shadow: inset 0 0 0 1px var(--rd-line);
    }
    .day.today {
      background: var(--rd-asphalt-3);
      box-shadow: inset 0 0 0 2px var(--rd-signal);
    }
    .label {
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--rd-muted);
    }
    .today .label {
      color: var(--rd-signal);
    }
    b {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-size: 16px;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .winner {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  `,
})
export class DayCards {
  readonly days = input.required<readonly DayCard[]>();
}
