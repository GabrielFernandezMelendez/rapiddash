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
}
