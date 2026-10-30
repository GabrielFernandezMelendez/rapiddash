import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import {
  defaultRival,
  EMPTY_RANKING,
  RankingView,
  RivalChoice,
  rivalOptions,
} from '../../../core/domain/race/ranking';
import { ALL_MAPS, RACE_MAPS, RaceMap, ZIGZAG_MAPS } from '../../../core/domain/track/race-map';
import { AccountService } from '../../../shared/account/account.service';
import { RankingService } from '../../../shared/account/ranking.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { MapCard } from '../../molecules/map-card/map-card';
import { MapDialog } from '../../organisms/map-dialog/map-dialog';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

@Component({
  selector: 'rd-map-select-page',
  imports: [MenuLayout, MapCard, MapDialog, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="back()">
          ← {{ 'maps.back' | t }}
        </button>
        <h1>{{ 'maps.title' | t }}</h1>
      </div>
      @for (group of groups; track group.key) {
        <h2 class="group">{{ group.key | t }}</h2>
        @for (map of group.maps; track map.id) {
          <rd-map-card
            [map]="map"
            [bestTime]="bestTimes()[map.id] ?? null"
            (choose)="open($event)"
          />
        }
      }
    </rd-menu-layout>

    @if (selected(); as map) {
      <rd-map-dialog
        [map]="map"
        [view]="view()"
        [options]="options()"
        [selected]="choice()"
        [loading]="loading()"
        [offline]="offline()"
        [myUid]="account.profile()?.uid ?? null"
        [myTime]="bestTimes()[map.id] ?? null"
        [myName]="account.profile()?.nickname ?? ''"
        [myCountry]="account.profile()?.country ?? null"
        (back)="selected.set(null)"
        (pick)="choice.set($event)"
        (start)="race($event)"
      />
    }
  `,
  styles: `
    .top {
      display: grid;
      justify-items: start;
      gap: 10px;
    }
    .group {
      margin: 6px 0 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--rd-signal);
    }
    h1 {
      margin: 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: 38px;
      line-height: 1;
      text-transform: uppercase;
    }
  `,
})
export class MapSelectPage implements OnInit {
  private readonly router = inject(Router);
  private readonly bestRuns = inject(BestRunRepository);
  private readonly ranking = inject(RankingService);
  protected readonly account = inject(AccountService);

  protected readonly groups = [
    { key: 'maps.group.classic', maps: RACE_MAPS },
    { key: 'maps.group.zigzag', maps: ZIGZAG_MAPS },
  ];
  protected readonly bestTimes = signal<Partial<Record<string, number>>>({});
  protected readonly selected = signal<RaceMap | null>(null);
  protected readonly view = signal<RankingView>(EMPTY_RANKING);
  protected readonly loading = signal(false);
  protected readonly offline = signal(false);
  protected readonly choice = signal<RivalChoice | null>(null);
  protected readonly options = computed(() => {
    const map = this.selected();
    return rivalOptions(
      this.view(),
      this.account.profile()?.uid ?? null,
      !!map && this.bestTimes()[map.id] !== undefined,
    );
  });

  async ngOnInit(): Promise<void> {
    const runs = await Promise.all(ALL_MAPS.map((m) => this.bestRuns.get(m.id)));
    const times: Record<string, number> = {};
    runs.forEach((run, i) => {
      if (run) times[ALL_MAPS[i].id] = run.time;
    });
    this.bestTimes.set(times);
  }

  protected async open(map: RaceMap): Promise<void> {
    // Mientras carga se ve el último ranking de ese mapa (si lo hay)
    this.view.set(this.ranking.lastView(map.id) ?? EMPTY_RANKING);
    this.offline.set(false);
    this.loading.set(true);
    this.selected.set(map);
    this.choice.set(defaultRival(this.options(), this.ranking.rememberedChoice(map.id)));
    const view = await this.ranking.load(map.id);
    if (this.selected() !== map) return;
    this.view.set(view);
    this.offline.set(view.total === null && view.top.length === 0);
    this.loading.set(false);
    this.choice.set(defaultRival(this.options(), this.ranking.rememberedChoice(map.id)));
  }

  protected race(map: RaceMap): void {
    const choice = this.choice();
    const options = this.options();
    this.ranking.pick(
      map.id,
      choice ? { choice, ranked: choice === 'mine' ? null : options[choice] } : null,
    );
    void this.router.navigate(['/race', map.id]);
  }

  protected back(): void {
    void this.router.navigate(['/']);
  }
}
