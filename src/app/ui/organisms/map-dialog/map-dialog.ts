import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CountryCode } from '../../../core/domain/profile/country';
import { RankingView, RivalChoice, RivalOptions } from '../../../core/domain/race/ranking';
import { RaceMap } from '../../../core/domain/track/race-map';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Difficulty } from '../../atoms/difficulty/difficulty';
import { Leaderboard } from '../../molecules/leaderboard/leaderboard';
import { Modal } from '../../molecules/modal/modal';
import { RivalPicker } from '../../molecules/rival-picker/rival-picker';

/** Ventana al elegir mapa: top 10, mi zona del ranking, contra quién corro y comenzar. */
@Component({
  selector: 'rd-map-dialog',
  imports: [Modal, Leaderboard, RivalPicker, Button, Difficulty, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="map().nameKey | t" (dismiss)="back.emit()">
      <div modal-title class="title">
        <span class="row">
          {{ map().nameKey | t }}
          @if (view().total; as total) {
            <span class="total">{{ total }} {{ (total === 1 ? 'leaderboard.driver' : 'leaderboard.drivers') | t }}</span>
          }
        </span>
        <span class="sub"
          ><rd-difficulty [level]="map().difficulty" />
          {{ 'difficulty.' + map().difficulty | t }}</span
        >
      </div>
      <rd-leaderboard
        [view]="view()"
        [myUid]="myUid()"
        [rivalUid]="rivalUid()"
        [loading]="loading()"
        [offline]="offline()"
      />
      <rd-rival-picker
        [options]="options()"
        [selected]="selected()"
        [myTime]="myTime()"
        [myName]="myName()"
        [myCountry]="myCountry()"
        (picked)="pick.emit($event)"
      />
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" (click)="back.emit()">
          {{ 'dialog.back' | t }}
        </button>
        <button rdButton type="button" [disabled]="loading()" (click)="start.emit(map())">
          {{ 'dialog.start' | t }}
        </button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    rd-rival-picker {
      margin-top: 6px;
    }
    .title {
      display: grid;
      gap: 6px;
    }
    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
    }
    .total,
    .sub {
      font-family: var(--rd-font-body);
      font-style: normal;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0;
      text-transform: none;
      color: var(--rd-muted);
    }
    .sub {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `,
})
export class MapDialog {
  readonly map = input.required<RaceMap>();
  readonly view = input.required<RankingView>();
  readonly options = input.required<RivalOptions>();
  readonly selected = input<RivalChoice | null>(null);
  readonly loading = input(false);
  readonly offline = input(false);
  readonly myUid = input<string | null>(null);
  readonly myTime = input<number | null>(null);
  readonly myName = input('');
  readonly myCountry = input<CountryCode | null>(null);
  readonly back = output<void>();
  readonly start = output<RaceMap>();
  readonly pick = output<RivalChoice>();

  /** El rival marcado en la lista (si es de la nube). */
  protected readonly rivalUid = computed(() => {
    const choice = this.selected();
    if (choice === 'top' || choice === 'above') return this.options()[choice]?.record.uid ?? null;
    return null;
  });
}
