import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MenuBackdropPort } from '../../../core/application/ports/out/menu-backdrop.port';
import { countryFromLocales } from '../../../core/domain/profile/country';
import { Profile } from '../../../core/domain/profile/profile';
import { provideMenuAdapters } from '../../../infrastructure/di/menu.providers';
import { AccountService } from '../../../shared/account/account.service';
import { AestheticService } from '../../../shared/aesthetic/aesthetic.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Logo } from '../../molecules/logo/logo';
import { EmailCredentials, EmailForm } from '../../organisms/email-form/email-form';
import { PilotData, PilotForm } from '../../organisms/pilot-form/pilot-form';
import { VerifyEmail } from '../../organisms/verify-email/verify-email';
import { WelcomeOptions } from '../../organisms/welcome-options/welcome-options';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';
import { authErrorKey } from './auth-error-key';
import { NicknameAvailabilityCheck } from './nickname-availability';

export type WelcomeStep = 'start' | 'signup' | 'login' | 'verify' | 'pilot';
const STEPS: readonly WelcomeStep[] = ['start', 'signup', 'login', 'verify', 'pilot'];

/**
 * Entrada al juego: bienvenida → (crear cuenta → verificar) o (iniciar sesión) → tu piloto.
 * Cada paso tiene su URL (/welcome/signup…) para que «atrás» funcione. Con perfil de invitado,
 * crear cuenta o entrar con Google vinculan la cuenta y conservan el piloto.
 */
@Component({
  selector: 'rd-welcome-page',
  imports: [
    MenuLayout,
    Button,
    Logo,
    WelcomeOptions,
    EmailForm,
    VerifyEmail,
    PilotForm,
    TranslatePipe,
  ],
  providers: [provideMenuAdapters()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      @if (current() === 'start') {
        <div menu-backdrop #backdrop class="backdrop" aria-hidden="true"></div>
      }
      <div menu-header class="top">
        @if (current() !== 'start' && current() !== 'verify') {
          <button rdButton variant="ghost" type="button" (click)="back()">
            ← {{ 'account.back' | t }}
          </button>
        }
      </div>

      @switch (current()) {
        @case ('start') {
          <div class="hero">
            <rd-logo [aesthetic]="aesthetic.aesthetic()" />
            <p class="lead">{{ 'welcome.lead' | t }}</p>
          </div>
        }
        @case ('signup') {
          <rd-email-form mode="signup" [busy]="busy()" [error]="error()" (submitted)="signUp($event)" />
        }
        @case ('login') {
          <rd-email-form
            mode="login"
            [busy]="busy()"
            [error]="error()"
            [notice]="notice()"
            (submitted)="signIn($event)"
            (forgot)="resetPassword($event)"
          />
        }
        @case ('verify') {
          <rd-verify-email
            [email]="email()"
            [busy]="busy()"
            [error]="error()"
            [notice]="notice()"
            (done)="checkVerified()"
            (resend)="resend()"
            (later)="next(account.profile())"
          />
        }
        @case ('pilot') {
          <rd-pilot-form
            [initialNickname]="account.profile()?.nickname ?? ''"
            [initialCountry]="account.profile()?.country ?? detectedCountry"
            [detected]="!account.profile() && !!detectedCountry"
            [availability]="nickname.state()"
            [language]="i18n.language()"
            [busy]="busy()"
            [error]="error()"
            (nicknameChange)="nickname.check($event)"
            (submitted)="savePilot($event)"
          />
        }
      }

      <div menu-footer>
        @if (current() === 'start') {
          <rd-welcome-options
            [busy]="busy()"
            [error]="error()"
            (google)="google()"
            (create)="go('signup')"
            (guest)="guest()"
            (login)="go('login')"
          />
        }
      </div>
    </rd-menu-layout>
  `,
  styles: `
    .backdrop {
      position: absolute;
      inset: 0;
    }
    .top {
      min-height: 40px;
    }
    .hero {
      display: grid;
      justify-items: center;
      gap: 14px;
      text-align: center;
    }
    /* En synthwave, el logo arriba para dejar ver el sol y la carretera (como en el menú) */
    :host-context([data-aesthetic='retro']) .hero,
    :host-context([data-aesthetic='futurist']) .hero {
      margin-top: -45%;
    }
    .lead {
      margin: 0;
      max-width: 28ch;
      color: var(--rd-chalk);
      font-size: 16px;
      line-height: 1.45;
      text-shadow: 0 1px 6px rgb(0 0 0 / 0.6);
    }
  `,
})
export class WelcomePage {
  /** Paso de la ruta /welcome/:step (withComponentInputBinding). */
  readonly step = input<string | undefined>();

  protected readonly account = inject(AccountService);
  protected readonly aesthetic = inject(AestheticService);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly backdrop = inject(MenuBackdropPort);
  private readonly backdropHost = viewChild<ElementRef<HTMLElement>>('backdrop');

  protected readonly current = computed<WelcomeStep>(() => {
    const step = this.step() as WelcomeStep;
    return STEPS.includes(step) ? step : 'start';
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly email = signal<string | null>(null);
  protected readonly detectedCountry = countryFromLocales(globalThis.navigator?.languages ?? []);
  protected readonly nickname = new NicknameAvailabilityCheck((n) => this.account.isNicknameFree(n));

  constructor() {
    // Fondo 3D (synthwave) solo en la bienvenida
    effect(() => {
      const host = this.backdropHost();
      const aesthetic = this.aesthetic.aesthetic();
      if (host) void this.backdrop.attach(host.nativeElement, aesthetic);
      else this.backdrop.dispose();
    });
    // Al cambiar de paso se limpian los mensajes
    effect(() => {
      this.current();
      this.error.set(null);
      this.notice.set(null);
      if (this.current() === 'verify') void this.loadEmail();
    });
    inject(DestroyRef).onDestroy(() => {
      this.backdrop.dispose();
      this.nickname.dispose();
    });
  }

  protected go(step: WelcomeStep): void {
    void this.router.navigate(step === 'start' ? ['/welcome'] : ['/welcome', step]);
  }

  protected back(): void {
    history.length > 1 ? history.back() : this.go('start');
  }

  protected google(): Promise<void> {
    return this.run(async () => this.next(await this.account.signInWithGoogle()));
  }

  protected guest(): Promise<void> {
    return this.run(async () => this.next(await this.account.playAsGuest()));
  }

  protected signUp({ email, password }: EmailCredentials): Promise<void> {
    return this.run(async () => {
      await this.account.signUpWithEmail(email, password);
      this.email.set(email);
      await this.router.navigate(['/welcome', 'verify'], { replaceUrl: true });
    });
  }

  protected signIn({ email, password }: EmailCredentials): Promise<void> {
    return this.run(async () => this.next(await this.account.signInWithEmail(email, password)));
  }

  protected resetPassword(email: string): Promise<void> {
    return this.run(async () => {
      await this.account.sendPasswordReset(email);
      this.notice.set('login.resetSent');
    });
  }

  protected checkVerified(): Promise<void> {
    return this.run(async () => {
      if (await this.account.checkVerified()) this.next(this.account.profile());
      else this.error.set('verify.notYet');
    });
  }

  protected resend(): Promise<void> {
    return this.run(async () => {
      await this.account.sendVerificationEmail();
      this.notice.set('verify.sent');
    });
  }

  protected savePilot({ nickname, country }: PilotData): Promise<void> {
    return this.run(async () => {
      const result = await this.account.savePilot(nickname, country);
      if (result.ok) await this.router.navigate(['/'], { replaceUrl: true });
      else if (result.problem === 'taken') this.nickname.taken();
    });
  }

  /** Con piloto, al menú; si no, a crearlo. */
  protected next(profile: Profile | null): void {
    void this.router.navigate(profile ? ['/'] : ['/welcome', 'pilot'], { replaceUrl: true });
  }

  private async loadEmail(): Promise<void> {
    if (!this.email()) this.email.set(await this.account.currentEmail().catch(() => null));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      await action();
    } catch (e) {
      this.error.set(authErrorKey(e));
    } finally {
      this.busy.set(false);
    }
  }
}
