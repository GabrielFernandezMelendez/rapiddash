import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { defaultRival, EMPTY_RANKING, RankingView, RivalChoice, rivalOptions } from '../../../core/domain/race/ranking';
import { ALL_MAPS } from '../../../core/domain/track/race-map';
import { AccountService } from '../../../shared/account/account.service';
import { DailyService } from '../../../shared/account/daily.service';
import { RankingService } from '../../../shared/account/ranking.service';
import { formatTime } from '../../../shared/format-time';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Trophy } from '../../atoms/trophy/trophy';
import { Leaderboard } from '../../molecules/leaderboard/leaderboard';
import { RivalPicker } from '../../molecules/rival-picker/rival-picker';
import { formatClock, MoreAttempts } from '../../organisms/more-attempts/more-attempts';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

/** Clave con la que se recuerda el rival del mapa del día (la misma todos los días). */
const DAILY_RIVAL_KEY = 'daily';

/** Mapa del día: el mapa de hoy, mi copa y mi puesto, el top 10 del día, contra quién corro y correr. */
@Component({
  selector: 'rd-daily-page',
  imports: [MenuLayout, Button, Trophy, Leaderboard, RivalPicker, MoreAttempts, TranslatePipe],
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
        [rivalUid]="rivalUid()"
        [loading]="loading()"
      />

      <rd-rival-picker
        [options]="options()"
        [selected]="choice()"
        [myTime]="myTime()"
        [myName]="account.profile()?.nickname ?? ''"
        [myCountry]="account.profile()?.country ?? null"
        (picked)="choice.set($event)"
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
  private readonly ranking = inject(RankingService);
  private readonly bestRuns = inject(BestRunRepository);

  protected readonly today = this.daily.today(ALL_MAPS);
  protected readonly view = signal<RankingView>(EMPTY_RANKING);
  protected readonly loading = signal(true);
  protected readonly askMore = signal(false);
  protected readonly busy = signal(false);
  protected readonly standing = computed(() => this.daily.standing(this.view()));
  /** Mi mejor tiempo de hoy en este dispositivo (fantasma «Tu mejor»). */
  protected readonly myTime = signal<number | null>(null);
  protected readonly choice = signal<RivalChoice | null>(null);
  protected readonly options = computed(() =>
    rivalOptions(this.view(), this.account.profile()?.uid ?? null, this.myTime() !== null),
  );
  /** El rival marcado en el top 10 (si es de la nube). */
  protected readonly rivalUid = computed(() => {
    const choice = this.choice();
    if (choice === 'top' || choice === 'above') return this.options()[choice]?.record.uid ?? null;
    return null;
  });
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
    const [view, best] = await Promise.all([
      this.daily.load(this.today.boardId),
      this.bestRuns.get(this.today.boardId),
    ]);
    this.view.set(view);
    this.myTime.set(best?.time ?? null);
    this.loading.set(false);
    this.choice.set(defaultRival(this.options(), this.ranking.rememberedChoice(DAILY_RIVAL_KEY)));
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
    // El rival se elige del ranking de hoy y la elección se recuerda para los días siguientes
    const choice = this.choice();
    this.ranking.pick(
      this.today.boardId,
      choice ? { choice, ranked: choice === 'mine' ? null : this.options()[choice] } : null,
      DAILY_RIVAL_KEY,
    );
    void this.router.navigate(['/race', this.today.mapId], { queryParams: { daily: 1 } });
  }
}
