import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { GoogleMark } from '../../atoms/google-mark/google-mark';

/** Tres caminos para entrar: Google, cuenta con correo o solo apodo. */
@Component({
  selector: 'rd-welcome-options',
  imports: [Button, GoogleMark, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error(); as error) {
      <p class="error" role="alert">{{ error | t }}</p>
    }
    <div class="actions">
      <button rdButton variant="light" type="button" [block]="true" [disabled]="busy()" (click)="google.emit()">
        <rd-google-mark />{{ 'welcome.google' | t }}
      </button>
      <button rdButton variant="secondary" type="button" [block]="true" [disabled]="busy()" (click)="create.emit()">
        {{ 'welcome.create' | t }}
      </button>
      <div class="or">{{ 'welcome.or' | t }}</div>
      <button rdButton variant="ghost" type="button" [block]="true" [disabled]="busy()" (click)="guest.emit()">
        {{ 'welcome.guest' | t }}
      </button>
      <button rdButton variant="link" type="button" [disabled]="busy()" (click)="login.emit()">
        {{ 'welcome.login' | t }}
      </button>
    </div>
  `,
  styleUrl: '../account-screen.scss',
  styles: `
    .or {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--rd-muted);
      font-size: 13px;
    }
    .or::before,
    .or::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--rd-line);
    }
  `,
})
export class WelcomeOptions {
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly google = output<void>();
  readonly create = output<void>();
  readonly guest = output<void>();
  readonly login = output<void>();
}
