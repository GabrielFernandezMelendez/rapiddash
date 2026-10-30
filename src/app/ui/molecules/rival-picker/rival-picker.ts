import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CountryCode } from '../../../core/domain/profile/country';
import { RIVAL_CHOICES, RivalChoice, RivalOptions } from '../../../core/domain/race/ranking';
import { formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Flag } from '../../atoms/flag/flag';

interface Option {
  readonly choice: RivalChoice;
  readonly available: boolean;
  readonly name: string;
  readonly country: CountryCode | null;
  readonly detail: string;
}

/**
 * «Corres contra»: el 1.º, el de justo encima o tu mejor vuelta, con lo que te sacan. Sin
 * ninguna disponible se corre contra el reloj.
 */
@Component({
  selector: 'rd-rival-picker',
  imports: [Flag, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>{{ 'rival.title' | t }}</h3>
    @if (anyAvailable()) {
      <div class="options" role="radiogroup" [attr.aria-label]="'rival.title' | t">
        @for (o of items(); track o.choice) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="o.choice === selected()"
            [class.on]="o.choice === selected()"
            [disabled]="!o.available"
            (click)="picked.emit(o.choice)"
          >
            <span class="label">{{ 'rival.' + o.choice | t }}</span>
            @if (o.available) {
              <span class="who"><rd-flag [country]="o.country" /><span>{{ o.name }}</span></span>
              <span class="detail">{{ o.detail }}</span>
            } @else {
              <span class="detail">{{ 'rival.none' | t }}</span>
            }
          </button>
        }
      </div>
    } @else {
      <p class="clock">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>
        </svg>
        {{ 'rival.clock' | t }}
      </p>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 8px;
    }
    h3 {
      margin: 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--rd-signal);
    }
    .options {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }
    button {
      display: grid;
      align-content: start;
      justify-items: start;
      gap: 4px;
      min-height: 76px;
      min-width: 0;
      padding: 8px 9px;
      border: 0;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-muted);
      text-align: left;
      cursor: pointer;
    }
    button.on {
      background: var(--rd-asphalt-3);
      color: var(--rd-chalk);
      box-shadow:
        inset 0 0 0 2px var(--rd-ghost),
        0 0 14px color-mix(in srgb, var(--rd-ghost) 30%, transparent);
    }
    button:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .label {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .who {
      display: flex;
      align-items: center;
      gap: 5px;
      max-width: 100%;
      font-size: 12px;
      color: var(--rd-chalk);
    }
    .who span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .detail {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
    .clock {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 52px;
      margin: 0;
      padding: 0 12px;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-muted);
    }
  `,
})
export class RivalPicker {
  readonly options = input.required<RivalOptions>();
  readonly selected = input<RivalChoice | null>(null);
  /** Mi mejor tiempo en el mapa (para las diferencias); null si no tengo. */
  readonly myTime = input<number | null>(null);
  readonly myName = input('');
  readonly myCountry = input<CountryCode | null>(null);
  readonly picked = output<RivalChoice>();

  protected readonly anyAvailable = computed(() => {
    const o = this.options();
    return o.top !== null || o.above !== null || o.mine;
  });

  protected readonly items = computed<Option[]>(() => {
    const o = this.options();
    const mine = this.myTime();
    return RIVAL_CHOICES.map((choice) => {
      if (choice === 'mine') {
        return {
          choice,
          available: o.mine && mine !== null,
          name: this.myName(),
          country: this.myCountry(),
          detail: mine === null ? '' : formatTime(mine),
        };
      }
      const ranked = o[choice];
      if (!ranked) return { choice, available: false, name: '', country: null, detail: '' };
      const { record, rank } = ranked;
      return {
        choice,
        available: true,
        name: choice === 'above' ? `${record.nickname} · #${rank}` : record.nickname,
        country: record.country,
        // Lo que te saca (negativo: es más rápido que tú); sin tiempo propio, su tiempo
        detail: mine === null ? formatTime(record.time) : `${signed(record.time - mine)} s`,
      };
    });
  });
}

/** −6.56 / +0.35, con el mismo formato que los tiempos. */
function signed(seconds: number): string {
  const sign = seconds < 0 ? '−' : '+';
  return `${sign}${Math.abs(seconds).toFixed(2)}`;
}
