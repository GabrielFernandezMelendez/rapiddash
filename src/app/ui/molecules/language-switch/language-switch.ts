import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Language, LANGUAGES } from '../../../core/domain/settings/language';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';

/** Selector segmentado de idioma. */
@Component({
  selector: 'rd-language-switch',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (lang of languages; track lang) {
      <button
        type="button"
        role="radio"
        [attr.aria-checked]="lang === value()"
        [class.active]="lang === value()"
        (click)="changed.emit(lang)"
      >
        <span class="code">{{ lang }}</span>
        {{ 'language.' + lang | t }}
      </button>
    }
  `,
  host: { role: 'radiogroup' },
  styles: `
    :host {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 4px;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt);
      box-shadow: inset 0 0 0 1px var(--rd-line);
    }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 44px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--rd-muted);
      font-weight: 600;
      cursor: pointer;
    }
    button.active {
      background: var(--rd-chalk);
      color: var(--rd-asphalt);
    }
    .code {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
  `,
})
export class LanguageSwitch {
  readonly value = input.required<Language>();
  readonly changed = output<Language>();
  protected readonly languages = LANGUAGES;
}
