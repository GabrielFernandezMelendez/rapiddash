import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RaceResult } from '../../../core/application/use-cases/race-session';
import { formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Modal } from '../../molecules/modal/modal';

@Component({
  selector: 'rd-results-panel',
  imports: [Modal, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="'results.title' | t" (dismiss)="maps.emit()">
      <span modal-title>{{ 'results.title' | t }}</span>
      <div class="result">
        @if (result().isRecord) {
          <span class="record">{{ 'results.record' | t }}</span>
        }
        <span class="label">{{ 'results.time' | t }}</span>
        <span class="time">{{ time() }}</span>
        @if (previous(); as p) {
          <span class="previous">{{ 'results.previous' | t }} · {{ p }}</span>
        }
      </div>
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" (click)="maps.emit()">
          {{ 'results.maps' | t }}
        </button>
        <button rdButton type="button" (click)="retry.emit()">{{ 'results.retry' | t }}</button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .result {
      display: grid;
      justify-items: center;
      gap: 4px;
      padding: 8px 0;
    }
    .record {
      padding: 3px 10px;
      border-radius: 4px;
      background: var(--rd-signal);
      color: #1a1408;
      font-family: var(--rd-font-display);
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .label {
      font-size: 13px;
      color: var(--rd-muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .time {
      font-family: var(--rd-font-display);
      font-weight: 800;
      font-size: 64px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .previous {
      font-size: 14px;
      color: var(--rd-muted);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class ResultsPanel {
  readonly result = input.required<RaceResult>();
  readonly retry = output<void>();
  readonly maps = output<void>();

  protected readonly time = computed(() => formatTime(this.result().time));
  protected readonly previous = computed(() => {
    const p = this.result().previousBest;
    return p === null ? null : formatTime(p);
  });
}
