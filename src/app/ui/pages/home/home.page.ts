import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Language } from '../../../core/domain/settings/language';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { SettingsDialog } from '../../organisms/settings-dialog/settings-dialog';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

@Component({
  selector: 'rd-home-page',
  imports: [MenuLayout, Button, SettingsDialog, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  protected readonly settingsOpen = signal(false);

  protected start(): void {
    void this.router.navigate(['/maps']);
  }

  protected setLanguage(language: Language): void {
    this.i18n.setLanguage(language);
  }
}
