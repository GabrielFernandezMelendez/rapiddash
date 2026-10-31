import { ChangeDetectionStrategy, Component, input, OnInit, output, signal } from '@angular/core';
import { NAME_MAX } from '../../../core/domain/tournament/tournament';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { TextInput } from '../../atoms/text-input/text-input';
import { Field } from '../../molecules/field/field';
import { Modal } from '../../molecules/modal/modal';

/** Ponerle nombre al torneo antes de crearlo. */
@Component({
  selector: 'rd-create-tournament',
  imports: [Modal, Field, TextInput, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="'tournament.create' | t" (dismiss)="cancel.emit()">
      <span modal-title>{{ 'tournament.create' | t }}</span>
      <rd-field [label]="'tournament.name' | t" for="t-name" [hint]="'tournament.nameHint' | t">
        <input
          rdInput
          id="t-name"
          [attr.maxlength]="max"
          [value]="name()"
          (input)="name.set($any($event.target).value)"
        />
      </rd-field>
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" (click)="cancel.emit()">
          {{ 'dialog.back' | t }}
        </button>
        <button rdButton type="button" [disabled]="busy()" (click)="create.emit(name())">
          {{ 'tournament.createGo' | t }}
        </button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .error {
      margin: 0;
      color: var(--rd-kerb);
      filter: brightness(1.25);
      font-size: 14px;
    }
  `,
})
export class CreateTournament implements OnInit {
  readonly defaultName = input('');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly create = output<string>();
  readonly cancel = output<void>();

  protected readonly max = NAME_MAX;
  protected readonly name = signal('');

  ngOnInit(): void {
    this.name.set(this.defaultName());
  }
}
