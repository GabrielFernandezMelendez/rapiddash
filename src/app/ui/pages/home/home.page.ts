import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { SettingsRepository } from '../../../core/application/ports/out/settings.repository';
import { AudioPort } from '../../../core/application/ports/out/audio.port';
import { MenuBackdropPort } from '../../../core/application/ports/out/menu-backdrop.port';
import { Aesthetic } from '../../../core/domain/settings/aesthetic';
import { Language } from '../../../core/domain/settings/language';
import { VolumeChannel, Volumes } from '../../../core/domain/settings/volume';
import { ALL_MAPS } from '../../../core/domain/track/race-map';
import { provideMenuAdapters } from '../../../infrastructure/di/menu.providers';
import { AccountService } from '../../../shared/account/account.service';
import { AestheticService } from '../../../shared/aesthetic/aesthetic.service';
import { formatTime } from '../../../shared/format-time';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Logo } from '../../molecules/logo/logo';
import { PilotChip } from '../../molecules/pilot-chip/pilot-chip';
import { LinkReminder } from '../../organisms/link-reminder/link-reminder';
import { SettingsDialog } from '../../organisms/settings-dialog/settings-dialog';
import { Tutorial } from '../../organisms/tutorial/tutorial';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';
import { authErrorKey } from '../welcome/auth-error-key';

@Component({
  selector: 'rd-home-page',
  imports: [MenuLayout, Button, Logo, PilotChip, LinkReminder, SettingsDialog, Tutorial, TranslatePipe],
  providers: [provideMenuAdapters()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage implements OnInit {
  private readonly router = inject(Router);
  private readonly backdrop = inject(MenuBackdropPort);
  protected readonly i18n = inject(I18nService);
  protected readonly aesthetic = inject(AestheticService);
  protected readonly account = inject(AccountService);
  private readonly bestRuns = inject(BestRunRepository);
  protected readonly settingsOpen = signal(false);
  protected readonly tutorialOpen = signal(false);
  private readonly settings = inject(SettingsRepository);
  private readonly audio = inject(AudioPort);
  protected readonly volumes = signal<Volumes>(this.settings.getVolumes());
  /** Aviso de vincular la cuenta (cada 5 días, solo invitados). */
  protected readonly reminderOpen = signal(false);
  protected readonly reminderRecords = signal('');
  protected readonly reminderBusy = signal(false);
  protected readonly reminderError = signal<string | null>(null);
  protected readonly reminderNotice = signal<string | null>(null);
  private readonly backdropHost = viewChild.required<ElementRef<HTMLElement>>('backdrop');

  constructor() {
    // El fondo 3D se monta (o se quita) cada vez que cambia la estética, también desde Ajustes
    effect(() => {
      const aesthetic = this.aesthetic.aesthetic();
      void this.backdrop.attach(this.backdropHost().nativeElement, aesthetic);
    });
    inject(DestroyRef).onDestroy(() => this.backdrop.dispose());
  }

  ngOnInit(): void {
    if (this.account.needsLinkReminder()) void this.openReminder();
  }

  protected setVolumes(volumes: Volumes): void {
    this.volumes.set(volumes);
    this.settings.setVolumes(volumes);
    this.audio.setVolumes(volumes);
  }

  /** La música del menú ya suena con el volumen nuevo; el motor necesita un ejemplo. */
  protected previewSound(channel: VolumeChannel): void {
    if (channel === 'effects') this.audio.preview(channel, this.volumes(), this.aesthetic.aesthetic());
  }

  protected openTutorial(): void {
    this.settingsOpen.set(false);
    this.tutorialOpen.set(true);
  }

  protected closeTutorial(): void {
    this.tutorialOpen.set(false);
    this.settings.setTutorialSeen();
  }

  protected openProfile(): void {
    void this.router.navigate(['/profile']);
  }

  /** Lo que perdería: número de récords y el primero de la lista de mapas. */
  private async openReminder(): Promise<void> {
    const runs = (await Promise.all(ALL_MAPS.map((m) => this.bestRuns.get(m.id)))).flatMap(
      (run, i) => (run ? [{ run, map: ALL_MAPS[i] }] : []),
    );
    if (runs.length) {
      const count = this.i18n
        .t(runs.length === 1 ? 'reminder.record' : 'reminder.records')
        .replace('{n}', String(runs.length));
      const best = this.i18n
        .t('reminder.bestOn')
        .replace('{time}', formatTime(runs[0].run.time))
        .replace('{map}', this.i18n.t(runs[0].map.nameKey));
      this.reminderRecords.set(`${count} · ${best}`);
    }
    this.reminderOpen.set(true);
  }

  protected async remindLater(): Promise<void> {
    this.reminderOpen.set(false);
    await this.account.snoozeLinkReminder();
  }

  protected linkGoogle(): Promise<void> {
    return this.runReminder(async () => {
      const profile = await this.account.signInWithGoogle();
      if (!profile) await this.router.navigate(['/welcome', 'pilot']);
      else this.reminderOpen.set(false);
    });
  }

  protected createAccount(): void {
    this.reminderOpen.set(false);
    void this.router.navigate(['/welcome', 'signup']);
  }

  protected resendVerification(): Promise<void> {
    return this.runReminder(async () => {
      await this.account.sendVerificationEmail();
      this.reminderNotice.set('verify.sent');
    });
  }

  protected checkVerified(): Promise<void> {
    return this.runReminder(async () => {
      if (await this.account.checkVerified()) this.reminderOpen.set(false);
      else this.reminderError.set('verify.notYet');
    });
  }

  private async runReminder(action: () => Promise<void>): Promise<void> {
    if (this.reminderBusy()) return;
    this.reminderBusy.set(true);
    this.reminderError.set(null);
    this.reminderNotice.set(null);
    try {
      await action();
    } catch (e) {
      this.reminderError.set(authErrorKey(e));
    } finally {
      this.reminderBusy.set(false);
    }
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
