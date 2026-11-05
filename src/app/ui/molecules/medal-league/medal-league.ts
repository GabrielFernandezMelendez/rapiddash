import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  leagueProgress,
  medalFor,
  MedalTargets,
  nextMedal,
} from '../../../core/domain/medals/medals';
import { formatTime } from '../../../shared/format-time';
import { MedalCoin } from '../medal-coin/medal-coin';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';


/**
 * Mi liga en un mapa: barra grande con la medalla que tengo y, debajo, la barra de la siguiente
 * con su tiempo objetivo y lo que me falta. La punta de la barra pequeña late y suelta chispas.
 */
@Component({
  selector: 'rd-medal-league',
  imports: [MedalCoin, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="league" [attr.data-medal]="current() ?? 'none'">
      <rd-medal-coin class="coin" [medal]="current()" [size]="28" />
      <span class="name">{{ 'medal.' + (current() ?? 'none') | t }}</span>
      <span class="bar"><i></i></span>
    </div>
    @if (next(); as n) {
      <div class="goal" [attr.data-medal]="n">
        <span class="goal-bar">
          <span class="track"><i class="fill" [style.width.%]="progress() * 100"></i></span>
          <span class="tip" [style.left.%]="progress() * 100">
            <i class="orb"></i>
            @for (k of sparks; track k) {
              <i class="spark" [style.--k]="k"></i>
            }
          </span>
        </span>
        <span class="goal-text">
          {{ 'medal.next' | t }} <b>{{ 'medal.' + n | t }}</b> {{ target() }}
          @if (gap(); as g) {
            <em>{{ 'medal.left' | t }} {{ g }}</em>
          }
        </span>
      </div>
    } @else {
      <span class="goal-text done">{{ 'medal.allDone' | t }}</span>
    }
  `,
  styleUrl: './medal-league.scss',
})
export class MedalLeague {
  readonly targets = input.required<MedalTargets>();
  /** Mi mejor tiempo en el mapa (null sin tiempo). */
  readonly best = input<number | null>(null);
  protected readonly sparks = Array.from({ length: 9 }, (_, i) => i);
  protected readonly current = computed(() => medalFor(this.best(), this.targets()));
  protected readonly next = computed(() => nextMedal(this.current()));
  protected readonly progress = computed(() => leagueProgress(this.best(), this.targets()));
  protected readonly target = computed(() => {
    const n = this.next();
    return n ? formatTime(this.targets()[n]) : '';
  });
  protected readonly gap = computed(() => {
    const n = this.next();
    const b = this.best();
    return n && b !== null ? formatTime(b - this.targets()[n]) : null;
  });
}
