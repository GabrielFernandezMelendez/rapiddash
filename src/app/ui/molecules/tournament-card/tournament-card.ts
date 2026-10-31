import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type TournamentCardStatus = 'running' | 'waiting' | 'finished';

/** Un torneo en «Mis torneos»: nombre, estado y una línea de detalle. */
@Component({
  selector: 'rd-tournament-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" [class]="status()" (click)="open.emit()">
      <span class="top">
        <span class="name">{{ name() }}</span>
        <span class="badge">{{ statusLabel() }}</span>
      </span>
      <span class="detail">{{ detail() }}</span>
      @if (extra()) {
        <span class="extra">{{ extra() }}</span>
      }
    </button>
  `,
  styles: `
    button {
      display: grid;
      gap: 6px;
      width: 100%;
      padding: 12px 14px;
      border: 0;
      border-radius: 12px;
      background: var(--rd-asphalt-2);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-chalk);
      text-align: left;
      cursor: pointer;
    }
    button.running {
      box-shadow: inset 0 0 0 2px var(--rd-go);
    }
    button.finished {
      opacity: 0.75;
    }
    .top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: 22px;
      text-transform: uppercase;
    }
    .badge {
      margin-left: auto;
      flex: none;
      padding: 1px 8px;
      border-radius: 999px;
      background: var(--rd-line);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .running .badge {
      background: var(--rd-go);
      color: var(--rd-asphalt);
    }
    .waiting .badge {
      background: var(--rd-ghost);
      color: var(--rd-asphalt);
    }
    .detail,
    .extra {
      font-size: 14px;
      color: var(--rd-muted);
    }
    .extra {
      color: var(--rd-chalk);
    }
  `,
})
export class TournamentCard {
  readonly name = input.required<string>();
  readonly status = input.required<TournamentCardStatus>();
  readonly statusLabel = input.required<string>();
  readonly detail = input('');
  readonly extra = input('');
  readonly open = output<void>();
}
