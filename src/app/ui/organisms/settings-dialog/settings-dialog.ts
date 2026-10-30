import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Aesthetic } from '../../../core/domain/settings/aesthetic';
import { Language } from '../../../core/domain/settings/language';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { AestheticSwitch } from '../../molecules/aesthetic-switch/aesthetic-switch';
import { LanguageSwitch } from '../../molecules/language-switch/language-switch';
import { Modal } from '../../molecules/modal/modal';

@Component({
  selector: 'rd-settings-dialog',
  imports: [Modal, LanguageSwitch, AestheticSwitch, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="'settings.title' | t" (dismiss)="closed.emit()">
      <span modal-title>{{ 'settings.title' | t }}</span>
      <div class="field">
        <span class="label">{{ 'settings.aesthetic' | t }}</span>
        <rd-aesthetic-switch [value]="aesthetic()" (changed)="aestheticChange.emit($event)" />
      </div>
      <div class="field">
        <span class="label">{{ 'settings.language' | t }}</span>
        <rd-language-switch [value]="language()" (changed)="languageChange.emit($event)" />
      </div>
      <div class="field">
        <span class="label">{{ 'settings.help' | t }}</span>
        <button type="button" class="help" (click)="tutorial.emit()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M10 9.5a2.2 2.2 0 1 1 3.2 2c-.8.4-1.2 1-1.2 1.8"></path>
            <path d="M12 16.5v.1"></path>
          </svg>
          <span class="help-text">
            <b>{{ 'settings.tutorial' | t }}</b>
            <small>{{ 'settings.tutorialHint' | t }}</small>
          </span>
        </button>
      </div>
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" class="full" (click)="closed.emit()">
          {{ 'settings.close' | t }}
        </button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .field {
      display: grid;
      gap: 8px;
    }
    .label {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--rd-signal);
    }
    .help {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 0 14px;
      border: 0;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt-3);
      box-shadow: inset 0 0 0 2px var(--rd-ghost);
      color: var(--rd-ghost);
      text-align: left;
      cursor: pointer;
    }
    .help-text {
      display: grid;
      gap: 2px;
      color: var(--rd-chalk);
    }
    .help-text b {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .help-text small {
      font-size: 13px;
      color: var(--rd-muted);
    }
    .full {
      grid-column: 1 / -1;
    }
  `,
})
export class SettingsDialog {
  readonly language = input.required<Language>();
  readonly languageChange = output<Language>();
  readonly aesthetic = input.required<Aesthetic>();
  readonly aestheticChange = output<Aesthetic>();
  readonly closed = output<void>();
  readonly tutorial = output<void>();
}
