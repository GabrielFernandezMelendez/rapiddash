import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';

/** Espera entre reenvíos del correo de verificación. */
export const RESEND_COOLDOWN_S = 60;

/** «Revisa tu correo»: ya verificado, reenviar (con espera) o seguir jugando y verificar luego. */
@Component({
  selector: 'rd-verify-email',
  imports: [Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mail" aria-hidden="true"></div>
    <h1 class="title">{{ 'verify.title' | t }}</h1>
    <p class="lead">
      {{ 'verify.sentTo' | t }} <b>{{ email() }}</b>. {{ 'verify.tapIt' | t }}
    </p>
    @if (error(); as error) {
      <p class="error" role="alert">{{ error | t }}</p>
    }
    @if (notice(); as notice) {
      <p class="notice" role="status">{{ notice | t }}</p>
    }
    <div class="actions">
      <button rdButton type="button" [block]="true" [disabled]="busy()" (click)="done.emit()">
        {{ 'verify.done' | t }}
      </button>
      <button
        rdButton
        variant="ghost"
        type="button"
        [block]="true"
        [disabled]="busy() || wait() > 0"
        (click)="resendNow()"
      >
        {{ 'verify.resend' | t }}{{ wait() > 0 ? ' (' + clock(wait()) + ')' : '' }}
      </button>
      <button rdButton variant="link" type="button" [disabled]="busy()" (click)="later.emit()">
        {{ 'verify.later' | t }}
      </button>
    </div>
  `,
  styleUrl: '../account-screen.scss',
  styles: `
    :host {
      justify-items: center;
      text-align: center;
    }
    .actions {
      width: 100%;
    }
    .mail {
      position: relative;
      width: 84px;
      height: 60px;
      border-radius: 9px;
      background: var(--rd-asphalt-3);
      box-shadow: inset 0 0 0 2px var(--rd-signal);
      overflow: hidden;
    }
    .mail::before {
      content: '';
      position: absolute;
      inset: -34px -8px auto;
      height: 64px;
      border-bottom: 2px solid var(--rd-signal);
      border-radius: 0 0 50% 50%;
    }
  `,
})
export class VerifyEmail {
  readonly email = input<string | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly notice = input<string | null>(null);
  readonly done = output<void>();
  readonly resend = output<void>();
  readonly later = output<void>();

  /** Segundos que faltan para poder reenviar: el correo se acaba de enviar al crear la cuenta. */
  protected readonly wait = signal(RESEND_COOLDOWN_S);

  constructor() {
    const timer = setInterval(() => this.wait.update((s) => Math.max(0, s - 1)), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected resendNow(): void {
    this.wait.set(RESEND_COOLDOWN_S);
    this.resend.emit();
  }

  protected clock(seconds: number): string {
    return `0:${String(seconds).padStart(2, '0')}`;
  }
}
