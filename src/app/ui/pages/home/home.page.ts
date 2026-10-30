import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MenuBackdropPort } from '../../../core/application/ports/out/menu-backdrop.port';
import { Aesthetic } from '../../../core/domain/settings/aesthetic';
import { Language } from '../../../core/domain/settings/language';
import { provideMenuAdapters } from '../../../infrastructure/di/menu.providers';
import { AestheticService } from '../../../shared/aesthetic/aesthetic.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Logo } from '../../molecules/logo/logo';
import { SettingsDialog } from '../../organisms/settings-dialog/settings-dialog';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

@Component({
  selector: 'rd-home-page',
  imports: [MenuLayout, Button, Logo, SettingsDialog, TranslatePipe],
  providers: [provideMenuAdapters()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage {
  private readonly router = inject(Router);
  private readonly backdrop = inject(MenuBackdropPort);
  protected readonly i18n = inject(I18nService);
  protected readonly aesthetic = inject(AestheticService);
  protected readonly settingsOpen = signal(false);
  private readonly backdropHost = viewChild.required<ElementRef<HTMLElement>>('backdrop');

  constructor() {
    // El fondo 3D se monta (o se quita) cada vez que cambia la estética, también desde Ajustes
    effect(() => {
      const aesthetic = this.aesthetic.aesthetic();
      void this.backdrop.attach(this.backdropHost().nativeElement, aesthetic);
    });
    inject(DestroyRef).onDestroy(() => this.backdrop.dispose());
  }

  protected start(): void {
    void this.router.navigate(['/maps']);
  }

  protected setLanguage(language: Language): void {
    this.i18n.setLanguage(language);
  }

  protected setAesthetic(aesthetic: Aesthetic): void {
    this.aesthetic.set(aesthetic);
  }
}
