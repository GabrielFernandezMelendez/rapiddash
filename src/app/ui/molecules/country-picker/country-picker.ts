import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { COUNTRY_CODES, CountryCode, isCountryCode } from '../../../core/domain/profile/country';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Flag } from '../../atoms/flag/flag';

/**
 * País con bandera. «Cambiar» abre la lista nativa del móvil (un <select> invisible encima),
 * que es la más cómoda para buscar entre 250 países.
 */
@Component({
  selector: 'rd-country-picker',
  imports: [Flag, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-flag [country]="value()" />
    <span class="name">{{ value() ? nameOf(value()!) : ('pilot.chooseCountry' | t) }}</span>
    <span class="change">{{ 'pilot.change' | t }}</span>
    <select
      [id]="selectId()"
      [attr.aria-label]="'pilot.country' | t"
      (change)="pick($event)"
    >
      <option value="" [selected]="!value()">{{ 'pilot.noCountry' | t }}</option>
      @for (c of options(); track c.code) {
        <option [value]="c.code" [selected]="c.code === value()">{{ c.name }}</option>
      }
    </select>
  `,
  styles: `
    :host {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 0 14px;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt-2);
      box-shadow: inset 0 0 0 1px var(--rd-line);
    }
    :host(:focus-within) {
      box-shadow: inset 0 0 0 2px var(--rd-signal);
    }
    .name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .change {
      margin-left: auto;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--rd-signal);
    }
    select {
      position: absolute;
      inset: 0;
      width: 100%;
      opacity: 0;
      cursor: pointer;
      font-size: 16px;
    }
  `,
})
export class CountryPicker {
  readonly value = input<CountryCode | null>(null);
  /** Idioma de los nombres de país. */
  readonly language = input('es');
  readonly selectId = input('country');
  readonly changed = output<CountryCode | null>();

  private readonly names = computed(
    () => new Intl.DisplayNames([this.language()], { type: 'region', fallback: 'code' }),
  );

  protected readonly options = computed(() => {
    const names = this.names();
    const collator = new Intl.Collator(this.language());
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) =>
      collator.compare(a.name, b.name),
    );
  });

  protected nameOf(code: CountryCode): string {
    return this.names().of(code) ?? code;
  }

  protected pick(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.changed.emit(isCountryCode(value) ? value : null);
  }
}
