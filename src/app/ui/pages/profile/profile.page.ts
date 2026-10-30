import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../../../shared/account/account.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { GoogleMark } from '../../atoms/google-mark/google-mark';
import { PilotData, PilotForm } from '../../organisms/pilot-form/pilot-form';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';
import { authErrorKey } from '../welcome/auth-error-key';
import { NicknameAvailabilityCheck } from '../welcome/nickname-availability';

/** Perfil (al tocar el chip del menú): cambiar apodo y país, vincular la cuenta o cerrar sesión. */
@Component({
  selector: 'rd-profile-page',
  imports: [MenuLayout, Button, GoogleMark, PilotForm, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header>
        <button rdButton variant="ghost" type="button" (click)="home()">← {{ 'account.back' | t }}</button>
      </div>

      @if (account.profile(); as profile) {
        <rd-pilot-form
          [initialNickname]="profile.nickname"
          [initialCountry]="profile.country"
          [availability]="nickname.state()"
          [language]="i18n.language()"
          [busy]="busy()"
          [error]="pilotError()"
          submitLabel="profile.save"
          (nicknameChange)="nickname.check($event)"
          (submitted)="save($event)"
        />

        <section class="account">
          <h2>{{ 'profile.account' | t }}</h2>
          <p class="kind">{{ 'profile.kind.' + profile.kind | t }}@if (email()) { · <b>{{ email() }}</b> }</p>
          @if (error(); as error) {
            <p class="error" role="alert">{{ error | t }}</p>
          }
          @if (notice(); as notice) {
            <p class="notice" role="status">{{ notice | t }}</p>
          }
          @if (profile.kind === 'guest') {
            <button rdButton variant="light" type="button" [block]="true" [disabled]="busy()" (click)="linkGoogle()">
              <rd-google-mark />{{ 'reminder.google' | t }}
            </button>
            <button rdButton variant="secondary" type="button" [block]="true" [disabled]="busy()" (click)="createAccount()">
              {{ 'welcome.create' | t }}
            </button>
            <button rdButton variant="link" type="button" [disabled]="busy()" (click)="login()">
              {{ 'welcome.login' | t }}
            </button>
          } @else {
            @if (profile.kind === 'unverified') {
              <button rdButton variant="secondary" type="button" [block]="true" [disabled]="busy()" (click)="checkVerified()">
                {{ 'verify.done' | t }}
              </button>
              <button rdButton variant="ghost" type="button" [block]="true" [disabled]="busy()" (click)="resend()">
                {{ 'verify.resend' | t }}
              </button>
            }
            <button rdButton variant="link" type="button" [disabled]="busy()" (click)="signOut()">
              {{ 'profile.signOut' | t }}
            </button>
          }
        </section>
      }
    </rd-menu-layout>
  `,
  styles: `
    .account {
      display: grid;
      gap: 10px;
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--rd-line);
    }
    h2 {
      margin: 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--rd-signal);
    }
    .kind {
      margin: 0;
      color: var(--rd-muted);
      word-break: break-all;
    }
    .kind b {
      color: var(--rd-chalk);
      font-weight: 600;
    }
    .error,
    .notice {
      margin: 0;
      font-size: 14px;
    }
    .error {
      color: var(--rd-kerb);
      filter: brightness(1.25);
    }
    .notice {
      color: var(--rd-go);
    }
  `,
})
export class ProfilePage {
  protected readonly account = inject(AccountService);
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pilotError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly email = signal<string | null>(null);
  protected readonly nickname = new NicknameAvailabilityCheck((n) => this.account.isNicknameFree(n));

  constructor() {
    void this.account.currentEmail().then((email) => this.email.set(email), () => undefined);
    inject(DestroyRef).onDestroy(() => this.nickname.dispose());
  }

  protected home(): void {
    void this.router.navigate(['/']);
  }

  protected save({ nickname, country }: PilotData): Promise<void> {
    return this.run(this.pilotError, async () => {
      const result = await this.account.savePilot(nickname, country);
      if (result.ok) this.home();
      else if (result.problem === 'taken') this.nickname.taken();
    });
  }

  protected linkGoogle(): Promise<void> {
    return this.run(this.error, async () => {
      const profile = await this.account.signInWithGoogle();
      // Esa cuenta de Google ya existía sin piloto: a crearlo
      if (!profile) await this.router.navigate(['/welcome', 'pilot']);
      else this.notice.set('profile.linked');
    });
  }

  protected createAccount(): void {
    void this.router.navigate(['/welcome', 'signup']);
  }

  protected login(): void {
    void this.router.navigate(['/welcome', 'login']);
  }

  protected checkVerified(): Promise<void> {
    return this.run(this.error, async () => {
      this.notice.set((await this.account.checkVerified()) ? 'profile.linked' : null);
      if (!this.notice()) this.error.set('verify.notYet');
    });
  }

  protected resend(): Promise<void> {
    return this.run(this.error, async () => {
      await this.account.sendVerificationEmail();
      this.notice.set('verify.sent');
    });
  }

  protected signOut(): Promise<void> {
    return this.run(this.error, async () => {
      await this.account.signOut();
      await this.router.navigate(['/welcome'], { replaceUrl: true });
    });
  }

  private async run(
    target: WritableSignal<string | null>,
    action: () => Promise<void>,
  ): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    this.pilotError.set(null);
    this.notice.set(null);
    try {
      await action();
    } catch (e) {
      target.set(authErrorKey(e));
    } finally {
      this.busy.set(false);
    }
  }
}
