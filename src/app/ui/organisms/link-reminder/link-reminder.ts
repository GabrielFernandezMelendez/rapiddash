import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Profile } from '../../../core/domain/profile/profile';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { GoogleMark } from '../../atoms/google-mark/google-mark';
import { Modal } from '../../molecules/modal/modal';

/**
 * Aviso cada 5 días a quien juega sin cuenta: enseña lo que perdería y ofrece vincular.
 * Si creó cuenta con correo pero no lo ha verificado, ofrece verificarlo.
 */
@Component({
  selector: 'rd-link-reminder',
  imports: [Modal, Button, Flag, GoogleMark, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="'reminder.title' | t" (dismiss)="later.emit()">
      <span modal-title>{{ 'reminder.title' | t }}</span>
      <p class="lead">
        {{ (profile().kind === 'unverified' ? 'reminder.leadUnverified' : 'reminder.lead') | t }}
      </p>
      <div class="keep">
        <rd-flag [country]="profile().country" />
        <span><b>{{ profile().nickname }}</b>@if (records()) { · {{ records() }} }</span>
      </div>
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }
      @if (notice(); as notice) {
        <p class="notice" role="status">{{ notice | t }}</p>
      }
      <div class="actions">
        @if (profile().kind === 'unverified') {
          <button rdButton type="button" [block]="true" [disabled]="busy()" (click)="verified.emit()">
            {{ 'verify.done' | t }}
          </button>
          <button rdButton variant="secondary" type="button" [block]="true" [disabled]="busy()" (click)="resend.emit()">
            {{ 'verify.resend' | t }}
          </button>
        } @else {
          <button rdButton variant="light" type="button" [block]="true" [disabled]="busy()" (click)="google.emit()">
            <rd-google-mark />{{ 'reminder.google' | t }}
          </button>
          <button rdButton variant="secondary" type="button" [block]="true" [disabled]="busy()" (click)="create.emit()">
            {{ 'welcome.create' | t }}
          </button>
        }
        <button rdButton variant="link" type="button" [disabled]="busy()" (click)="later.emit()">
          {{ 'reminder.later' | t }}
        </button>
      </div>
    </rd-modal>
  `,
  styles: `
    .lead {
      margin: 0;
      color: var(--rd-muted);
      line-height: 1.45;
    }
    .keep {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--rd-radius);
      background: rgb(226 72 58 / 0.12);
      box-shadow: inset 0 0 0 1px rgb(226 72 58 / 0.4);
      font-size: 14px;
    }
    .keep b {
      font-weight: 700;
    }
    .actions {
      display: grid;
      gap: 10px;
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
export class LinkReminder {
  readonly profile = input.required<Profile>();
  /** «6 récords · 0:41.27 en Bahía» (ya traducido); vacío si no tiene récords. */
  readonly records = input('');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly notice = input<string | null>(null);
  readonly google = output<void>();
  readonly create = output<void>();
  readonly resend = output<void>();
  readonly verified = output<void>();
  readonly later = output<void>();
}
