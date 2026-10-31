import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Modal } from '../../molecules/modal/modal';

/**
 * Ventana centrada cuando no quedan intentos del mapa del día: esperar a que llegue la próxima
 * ronda o volver ya a la pista viendo un anuncio.
 */
@Component({
  selector: 'rd-more-attempts',
  imports: [Modal, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="'more.title' | t" [centered]="true" (dismiss)="wait.emit()">
      <span modal-title>{{ 'more.title' | t }}</span>
      <p class="lead">
        {{ 'more.next' | t }} <b>{{ mapName() }}</b> {{ 'more.in' | t }}
        <b class="clock">{{ clock() }}</b>.
      </p>
      <p class="lead">{{ 'more.ask' | t }}</p>
      <ng-container modal-actions>
        <button rdButton type="button" class="ad" [disabled]="busy()" (click)="watch.emit()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect><path d="M10 9l5 3-5 3z"></path>
          </svg>
          {{ 'more.watch' | t }}
        </button>
        <button rdButton variant="link" type="button" class="later" (click)="wait.emit()">
          {{ 'more.wait' | t }}
        </button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .lead {
      margin: 0;
      line-height: 1.45;
      color: var(--rd-muted);
    }
    .lead b {
      color: var(--rd-chalk);
    }
    .clock {
      font-variant-numeric: tabular-nums;
    }
    .ad,
    .later {
      grid-column: 1 / -1;
    }
    .ad {
      white-space: nowrap;
      font-size: 17px;
    }
  `,
})
export class MoreAttempts implements OnInit {
  readonly mapName = input('');
  /** Milisegundos hasta que la espera dé intentos. */
  readonly waitMs = input(0);
  readonly busy = input(false);
  readonly watch = output<void>();
  readonly wait = output<void>();

  protected readonly clock = signal('');
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // La cuenta atrás parte del valor recibido al abrir la ventana
    const deadline = Date.now() + this.waitMs();
    const tick = () => this.clock.set(formatClock(Math.max(0, deadline - Date.now())));
    tick();
    const timer = setInterval(tick, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}

/** 2:59:41 */
export function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
