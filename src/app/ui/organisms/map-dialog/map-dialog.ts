import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LeaderboardEntry } from '../../../core/domain/race/leaderboard';
import { RaceMap } from '../../../core/domain/track/race-map';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Difficulty } from '../../atoms/difficulty/difficulty';
import { Leaderboard } from '../../molecules/leaderboard/leaderboard';
import { Modal } from '../../molecules/modal/modal';

/** Ventana al elegir mapa: top 10 + volver / comenzar. */
@Component({
  selector: 'rd-map-dialog',
  imports: [Modal, Leaderboard, Button, Difficulty, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="map().nameKey | t" (dismiss)="back.emit()">
      <div modal-title class="title">
        {{ map().nameKey | t }}
        <span class="sub"
          ><rd-difficulty [level]="map().difficulty" />
          {{ 'difficulty.' + map().difficulty | t }}</span
        >
      </div>
      <rd-leaderboard [entries]="entries()" />
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" (click)="back.emit()">
          {{ 'dialog.back' | t }}
        </button>
        <button rdButton type="button" (click)="start.emit(map())">{{ 'dialog.start' | t }}</button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .title {
      display: grid;
      gap: 6px;
    }
    .sub {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--rd-font-body);
      font-size: 13px;
      font-weight: 500;
      text-transform: none;
      color: var(--rd-muted);
    }
  `,
})
export class MapDialog {
  readonly map = input.required<RaceMap>();
  readonly entries = input<readonly LeaderboardEntry[]>([]);
  readonly back = output<void>();
  readonly start = output<RaceMap>();
}
