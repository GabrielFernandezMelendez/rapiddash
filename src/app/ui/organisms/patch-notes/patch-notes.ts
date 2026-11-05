import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PATCH_NOTES } from '../../../core/domain/settings/patch-notes';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Modal } from '../../molecules/modal/modal';

/** Novedades de la versión: salen solas una vez y desde el botón bajo Ajustes. */
@Component({
  selector: 'rd-patch-notes',
  imports: [Modal, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [centered]="true" [label]="('patch.title' | t) + ' ' + version()" (dismiss)="closed.emit()">
      <span modal-title>{{ 'patch.title' | t }} {{ version() }}</span>
      <ul class="notes">
        @for (note of notes; track note) {
          <li>{{ note | t }}</li>
        }
      </ul>
      <ng-container modal-actions>
        <button rdButton type="button" class="full" (click)="closed.emit()">{{ 'patch.ok' | t }}</button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .notes {
      display: grid;
      gap: 12px;
      margin: 0;
      padding: 0 0 0 20px;
      font-size: 16px;
      line-height: 1.35;
      color: var(--rd-chalk);
    }
    .notes li::marker {
      color: var(--rd-neon-cyan);
    }
    .full {
      grid-column: 1 / -1;
    }
  `,
})
export class PatchNotes {
  readonly version = input.required<string>();
  readonly closed = output<void>();
  protected readonly notes = PATCH_NOTES;
}
