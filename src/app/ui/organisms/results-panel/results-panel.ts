import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RaceResult } from '../../../core/application/use-cases/race-session';
import { Standing } from '../../../core/application/use-cases/ranking-board';
import { formatTime } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { Modal } from '../../molecules/modal/modal';

@Component({
  selector: 'rd-results-panel',
  imports: [Modal, Button, Flag, TranslatePipe],
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
      @if (standing(); as st) {
        <div class="standing">
          <span class="label">{{ 'results.worldRank' | t }}</span>
          <span class="rank">
            <b>#{{ st.rank }}</b>
            @if (st.gained) {
              <span class="up">{{ 'results.up' | t }} {{ st.gained }}</span>
            }
          </span>
          @if (st.total) {
            <span class="of">{{ 'results.of' | t }} {{ st.total }} {{ 'leaderboard.drivers' | t }}</span>
          }
        </div>
        @if (st.next; as next) {
          <div class="next">
            @if (st.gained) {
              <span>{{ passedLabel() }}</span>
            }
            <span class="who">
              {{ 'results.nextRival' | t }}
              <rd-flag [country]="next.record.country" />
              <b>{{ next.record.nickname }} · #{{ next.rank }}</b>
              <span class="gap">{{ nextGap() }}</span>
            </span>
          </div>
        }
      }
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" (click)="maps.emit()">
          {{ 'results.maps' | t }}
        </button>
        <button rdButton type="button" (click)="retry.emit()">
          {{ (standing()?.next ? 'results.retryNext' : 'results.retry') | t }}
        </button>
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
      font-style: var(--rd-display-style);
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
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: 64px;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .standing {
      display: grid;
      gap: 2px;
      padding: 10px 12px;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt);
      box-shadow: inset 0 0 0 1px var(--rd-line);
    }
    .standing .label {
      font-size: 11px;
    }
    .rank {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .rank b {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-size: 32px;
      line-height: 1;
    }
    .up {
      font-size: 13px;
      font-weight: 600;
      color: var(--rd-go);
    }
    .of {
      font-size: 12px;
      color: var(--rd-muted);
    }
    .next {
      display: grid;
      gap: 6px;
      padding: 10px 12px;
      border-radius: var(--rd-radius);
      background: color-mix(in srgb, var(--rd-ghost) 10%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rd-ghost) 45%, transparent);
      font-size: 13px;
    }
    .who {
      display: flex;
      align-items: center;
      gap: 7px;
      color: var(--rd-muted);
    }
    .who b {
      color: var(--rd-chalk);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .gap {
      margin-left: auto;
      color: var(--rd-chalk);
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
  /** Puesto mundial tras la carrera (null sin red o sin piloto). */
  readonly standing = input<Standing | null>(null);
  /** Texto ya traducido de «Has adelantado a N pilotos». */
  readonly passedLabel = input('');
  readonly retry = output<void>();
  readonly maps = output<void>();

  protected readonly time = computed(() => formatTime(this.result().time));
  /** Lo que me saca el siguiente rival respecto a mi mejor tiempo. */
  protected readonly nextGap = computed(() => {
    const next = this.standing()?.next;
    if (!next) return '';
    const r = this.result();
    const best = r.previousBest === null ? r.time : Math.min(r.time, r.previousBest);
    return `−${Math.max(0, best - next.record.time).toFixed(2)} s`;
  });
  protected readonly previous = computed(() => {
    const p = this.result().previousBest;
    return p === null ? null : formatTime(p);
  });
}
