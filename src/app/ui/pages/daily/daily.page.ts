import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY_RANKING, RankingView } from '../../../core/domain/race/ranking';
import { ALL_MAPS } from '../../../core/domain/track/race-map';
import { AccountService } from '../../../shared/account/account.service';
import { DailyService } from '../../../shared/account/daily.service';
import { formatTime } from '../../../shared/format-time';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Trophy } from '../../atoms/trophy/trophy';
import { Leaderboard } from '../../molecules/leaderboard/leaderboard';
import { formatClock, MoreAttempts } from '../../organisms/more-attempts/more-attempts';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

/** Mapa del día: el mapa de hoy, mi copa y mi puesto, el top 10 del día y correr. */
@Component({
  selector: 'rd-daily-page',
  imports: [MenuLayout, Button, Trophy, Leaderboard, MoreAttempts, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="back()">← {{ 'maps.back' | t }}</button>
        <h1>{{ 'daily.title' | t }}</h1>
        <span class="sub">{{ date() }} · {{ 'daily.same' | t }}</span>
      </div>

      <div class="map" [class]="'map theme-' + today.map.theme">
        <span class="art" aria-hidden="true"></span>
        <span class="info">
          <span class="name">{{ today.map.nameKey | t }}</span>
          <span class="meta">{{ 'difficulty.' + today.map.difficulty | t }}</span>
        </span>
      </div>

      <div class="stats">
        <div class="stat">
          <span class="label">{{ 'daily.yourPosition' | t }}</span>
          @if (standing(); as st) {
            <span class="value">
              <rd-trophy [kind]="st.trophy" [size]="28" />
              <b>#{{ st.rank }}</b>
            </span>
            <small>{{ time(st.time) }} · {{ 'results.of' | t }} {{ st.total }}</small>
          } @else {
            <span class="value muted">{{ (loading() ? 'daily.loading' : 'daily.noTimeShort') | t }}</span>
          }
        </div>
        <div class="stat">
          <span class="label">{{ 'daily.available' | t }}</span>
          <span class="value"><b class="clock">{{ countdown() }}</b></span>
          <small>{{ 'daily.untilNew' | t }}</small>
        </div>
      </div>

      <rd-leaderboard
        title="daily.top"
        [view]="view()"
        [myUid]="account.profile()?.uid ?? null"
        [loading]="loading()"
      />

      <div menu-footer>
        <button rdButton type="button" [block]="true" class="go" (click)="race()">
          {{ 'daily.race' | t }}
        </button>
      </div>
    </rd-menu-layout>

    @if (askMore()) {
      <rd-more-attempts
        [mapName]="today.map.nameKey | t"
        [waitMs]="daily.waitRemaining()"
        [busy]="busy()"
        (watch)="watchAd()"
        (wait)="askMore.set(false)"
      />
    }
  `,
  styleUrl: './daily.page.scss',
})
export class DailyPage implements OnInit {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  protected readonly account = inject(AccountService);
  protected readonly daily = inject(DailyService);

  protected readonly today = this.daily.today(ALL_MAPS);
  protected readonly view = signal<RankingView>(EMPTY_RANKING);
  protected readonly loading = signal(true);
  protected readonly askMore = signal(false);
  protected readonly busy = signal(false);
  protected readonly standing = computed(() => this.daily.standing(this.view()));
  protected readonly countdown = signal('');
  protected readonly date = computed(() =>
    new Intl.DateTimeFormat(this.i18n.language(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Madrid',
    }).format(new Date()),
  );

  constructor() {
    const end = Date.now() + this.today.msLeft;
    const tick = () => this.countdown.set(formatClock(Math.max(0, end - Date.now())));
    tick();
    const timer = setInterval(tick, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  async ngOnInit(): Promise<void> {
    this.view.set(await this.daily.load(this.today.boardId));
    this.loading.set(false);
  }

  protected time(seconds: number): string {
    return formatTime(seconds);
  }

  protected back(): void {
    void this.router.navigate(['/']);
  }

  protected race(): void {
    if (this.daily.canRace()) this.go();
    else this.askMore.set(true);
  }

  protected async watchAd(): Promise<void> {
    this.busy.set(true);
    const ok = await this.daily.watchAd();
    this.busy.set(false);
    if (ok) {
      this.askMore.set(false);
      this.go();
    }
  }

  private go(): void {
    void this.router.navigate(['/race', this.today.mapId], { queryParams: { daily: 1 } });
  }
}
