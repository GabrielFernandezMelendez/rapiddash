import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CountryCode, flagEmoji } from '../../../core/domain/profile/country';

/** Bandera del país (emoji). Sin país, una bandera blanca. */
@Component({
  selector: 'rd-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ emoji() }}`,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      display: inline-block;
      font-size: 1.25em;
      line-height: 1;
      font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
      font-style: normal;
    }
  `,
})
export class Flag {
  readonly country = input<CountryCode | null>(null);
  protected readonly emoji = computed(() => {
    const country = this.country();
    return country ? flagEmoji(country) : '🏳️';
  });
}
