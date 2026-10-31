import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Modal } from '../../molecules/modal/modal';

/**
 * Ventana centrada para confirmar algo que no se puede deshacer (eliminar un torneo…).
 * El foco empieza en «Cancelar», para que un toque o un Intro por error no borre nada.
 */
@Component({
  selector: 'rd-confirm-dialog',
  imports: [Modal, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="title()" [centered]="true" (dismiss)="cancel.emit()">
      <span modal-title>{{ title() }}</span>
      <p class="text">{{ text() }}</p>
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" class="cancel" (click)="cancel.emit()">
          {{ 'confirm.cancel' | t }}
        </button>
        <button rdButton type="button" class="danger" [disabled]="busy()" (click)="confirm.emit()">
          {{ confirmLabel() }}
        </button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .text {
      margin: 0;
      line-height: 1.45;
      color: var(--rd-muted);
    }
    .error {
      margin: 0;
      color: var(--rd-kerb);
      filter: brightness(1.25);
    }
    .danger.danger {
      background: var(--rd-kerb);
      color: #fff;
      box-shadow: 0 4px 0 rgb(0 0 0 / 0.35);
    }
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly text = input('');
  readonly confirmLabel = input.required<string>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly confirm = output<void>();
  readonly cancel = output<void>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>('.cancel')?.focus());
  }
}
