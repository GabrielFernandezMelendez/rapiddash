import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { formatDelta, formatTime } from '../../../shared/format-time';
import { I18nService } from '../../../shared/i18n/i18n.service';

/** Qué anuncia el cartel: nueva vuelta, la última o la meta. */
export type LapBannerKind = 'lap' | 'last' | 'finish';

/**
 * Cartel grande en el centro de la carrera al cruzar la línea: «VUELTA 2/3», «ÚLTIMA VUELTA» o
 * «¡META!», con la letra del «DASH» del logo de cada estética. Debajo, el tiempo de la vuelta y la
 * diferencia con el fantasma (o el tiempo total en la meta). Entra con un golpe de escala y se
 * desvanece; con «Reducir movimiento», solo aparece y desaparece. Se anuncia al lector de pantalla.
 */
@Component({
  selector: 'rd-lap-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="banner" role="status" aria-live="polite">
      <span class="big" [class.stack]="kind() === 'last'">
        {{ big() }}@if (small(); as small) {<small>{{ small }}</small>}
      </span>
      @if (time() !== null) {
        <span class="pill">
          <span>{{ timeLabel() }}</span>
          @if (deltaText(); as d) {
            <span [class.good]="(delta() ?? 0) <= 0" [class.bad]="(delta() ?? 0) > 0">{{ d }}</span>
          }
        </span>
      }
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 28% 0 auto;
      z-index: 6;
      pointer-events: none;
    }
    .banner {
      display: grid;
      justify-items: center;
      gap: 8px;
      animation: pop var(--rd-banner-time, 1.6s) ease-out both;
    }
    .big {
      font: var(--rd-dash-font);
      text-transform: var(--rd-dash-case);
      color: var(--rd-dash-color);
      text-shadow: var(--rd-dash-shadow);
      transform: var(--rd-dash-transform);
      white-space: nowrap;
      text-align: center;
    }
    .big small {
      margin-left: 0.18em;
      font-size: 0.62em;
      color: #fff;
      text-shadow: var(--rd-dash-small-shadow);
    }
    .big.stack small {
      display: block;
      margin: 4px 0 0;
    }
    .pill {
      display: flex;
      gap: 10px;
      align-items: baseline;
      padding: 4px 12px;
      border-radius: 999px;
      background: var(--rd-dash-pill);
      box-shadow: inset 0 0 0 1px var(--rd-dash-pill-ring);
      font-family: var(--rd-font-hud-text);
      font-weight: 700;
      font-size: 20px;
      color: #fff;
      font-variant-numeric: tabular-nums;
    }
    .good {
      color: var(--rd-go);
    }
    .bad {
      color: var(--rd-kerb);
      filter: brightness(1.3);
    }
    @keyframes pop {
      0% {
        opacity: 0;
        transform: scale(1.6);
      }
      12% {
        opacity: 1;
        transform: scale(0.92);
      }
      20% {
        transform: scale(1);
      }
      82% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .banner {
        animation: none;
      }
    }
  `,
})
export class LapBannerComponent {
  readonly kind = input.required<LapBannerKind>();
  readonly lap = input(1);
  readonly total = input(3);
  /** Tiempo de la vuelta terminada (o total en la meta); null para no mostrarlo. */
  readonly time = input<number | null>(null);
  /** Diferencia con el fantasma en esa vuelta; null sin fantasma. */
  readonly delta = input<number | null>(null);
  /** En la meta: el texto que acompaña al tiempo («¡Nuevo récord!»). */
  readonly note = input('');

  private readonly i18n = inject(I18nService);

  protected readonly big = computed(() => {
    const k = this.kind();
    return this.i18n.t(k === 'lap' ? 'race.lap' : k === 'last' ? 'race.lastLap' : 'race.finish');
  });
  protected readonly small = computed(() => {
    const k = this.kind();
    if (k === 'lap') return `${this.lap()}/${this.total()}`;
    return k === 'last' ? this.i18n.t('race.lastLapSub') : '';
  });
  protected readonly timeLabel = computed(() => {
    const t = this.time();
    if (t === null) return '';
    if (this.kind() === 'finish') return formatTime(t);
    return `${this.i18n.t('race.lapShort')}${this.lap() - 1} ${formatTime(t)}`;
  });
  protected readonly deltaText = computed(() => {
    if (this.kind() === 'finish') return this.note();
    const d = this.delta();
    return d === null ? '' : formatDelta(d);
  });
}
