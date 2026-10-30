import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { TextInput } from '../../atoms/text-input/text-input';
import { Field, FieldTone } from '../../molecules/field/field';

export const PASSWORD_MIN = 8;

export interface EmailCredentials {
  readonly email: string;
  readonly password: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Crear cuenta (correo, contraseña y repetirla) o iniciar sesión (correo y contraseña). */
@Component({
  selector: 'rd-email-form',
  imports: [Button, TextInput, Field, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="title">{{ (signup() ? 'signup.title' : 'login.title') | t }}</h1>
    <form class="fields" (submit)="submit($event)" novalidate>
      <rd-field [label]="'field.email' | t" for="email" [hint]="emailHint() | t" tone="error">
        <input
          rdInput
          id="email"
          type="email"
          autocomplete="email"
          inputmode="email"
          autocapitalize="off"
          spellcheck="false"
          [invalid]="!!emailHint()"
          [value]="email()"
          (input)="email.set(value($event))"
          (blur)="emailTouched.set(true)"
        />
      </rd-field>
      <rd-field
        [label]="'field.password' | t"
        for="password"
        [hint]="passwordHint() | t"
        [tone]="passwordTone()"
      >
        <button field-end type="button" class="toggle" (click)="show.set(!show())">
          {{ (show() ? 'field.hide' : 'field.show') | t }}
        </button>
        <input
          rdInput
          id="password"
          [type]="show() ? 'text' : 'password'"
          [attr.autocomplete]="signup() ? 'new-password' : 'current-password'"
          [invalid]="passwordTone() === 'error'"
          [value]="password()"
          (input)="password.set(value($event))"
        />
      </rd-field>
      @if (signup()) {
        <rd-field [label]="'field.repeat' | t" for="repeat" [hint]="repeatHint() | t" tone="error">
          <input
            rdInput
            id="repeat"
            [type]="show() ? 'text' : 'password'"
            autocomplete="new-password"
            [invalid]="!!repeatHint()"
            [value]="repeat()"
            (input)="repeat.set(value($event))"
          />
        </rd-field>
      }
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }
      @if (notice(); as notice) {
        <p class="notice" role="status">{{ notice | t }}</p>
      }
      <div class="actions">
        <button rdButton type="submit" [block]="true" [disabled]="!valid() || busy()">
          {{ (signup() ? 'signup.submit' : 'login.submit') | t }}
        </button>
        @if (signup()) {
          <p class="fine">{{ 'signup.fine' | t }}</p>
        } @else {
          <button rdButton variant="link" type="button" [disabled]="busy()" (click)="forgotPassword()">
            {{ 'login.forgot' | t }}
          </button>
        }
      </div>
    </form>
  `,
  styleUrl: '../account-screen.scss',
})
export class EmailForm {
  readonly mode = input<'signup' | 'login'>('signup');
  readonly busy = input(false);
  /** Claves i18n. */
  readonly error = input<string | null>(null);
  readonly notice = input<string | null>(null);
  readonly submitted = output<EmailCredentials>();
  readonly forgot = output<string>();

  protected readonly email = signal('');
  protected readonly emailTouched = signal(false);
  protected readonly password = signal('');
  protected readonly repeat = signal('');
  protected readonly show = signal(false);

  protected readonly signup = computed(() => this.mode() === 'signup');
  private readonly emailOk = computed(() => EMAIL.test(this.email().trim()));
  private readonly longEnough = computed(() => this.password().length >= PASSWORD_MIN);

  protected readonly emailHint = computed(() =>
    this.emailTouched() && this.email() && !this.emailOk() ? 'auth.error.invalid-email' : '',
  );
  protected readonly passwordTone = computed<FieldTone>(() => {
    if (!this.signup() || !this.password()) return 'neutral';
    return this.longEnough() ? 'ok' : 'error';
  });
  protected readonly passwordHint = computed(() =>
    this.signup() ? 'password.min' : '',
  );
  protected readonly repeatHint = computed(() =>
    this.repeat() && this.repeat() !== this.password() ? 'password.mismatch' : '',
  );

  protected readonly valid = computed(() =>
    this.signup()
      ? this.emailOk() && this.longEnough() && this.repeat() === this.password()
      : this.emailOk() && this.password().length > 0,
  );

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.valid() && !this.busy()) {
      this.submitted.emit({ email: this.email().trim(), password: this.password() });
    }
  }

  protected forgotPassword(): void {
    this.emailTouched.set(true);
    if (this.emailOk()) this.forgot.emit(this.email().trim());
  }
}
