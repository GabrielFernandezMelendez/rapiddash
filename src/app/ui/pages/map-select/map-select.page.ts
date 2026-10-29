import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { LeaderboardRepository } from '../../../core/application/ports/out/leaderboard.repository';
import { LEADERBOARD_SIZE, LeaderboardEntry } from '../../../core/domain/race/leaderboard';
import { RACE_MAPS, RaceMap } from '../../../core/domain/track/race-map';
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
      @for (map of maps; track map.id) {
        <rd-map-card [map]="map" [bestTime]="bestTimes()[map.id] ?? null" (choose)="open($event)" />
      }
    </rd-menu-layout>

    @if (selected(); as map) {
      <rd-map-dialog
        [map]="map"
        [entries]="entries()"
        (back)="selected.set(null)"
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
    h1 {
      margin: 0;
      font-family: var(--rd-font-display);
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
  private readonly leaderboard = inject(LeaderboardRepository);

  protected readonly maps = RACE_MAPS;
  protected readonly bestTimes = signal<Partial<Record<string, number>>>({});
  protected readonly selected = signal<RaceMap | null>(null);
  protected readonly entries = signal<LeaderboardEntry[]>([]);

  async ngOnInit(): Promise<void> {
    const runs = await Promise.all(RACE_MAPS.map((m) => this.bestRuns.get(m.id)));
    const times: Record<string, number> = {};
    runs.forEach((run, i) => {
      if (run) times[RACE_MAPS[i].id] = run.time;
    });
    this.bestTimes.set(times);
  }

  protected async open(map: RaceMap): Promise<void> {
    this.entries.set([]);
    this.selected.set(map);
    this.entries.set(await this.leaderboard.top(map.id, LEADERBOARD_SIZE));
  }

  protected race(map: RaceMap): void {
    void this.router.navigate(['/race', map.id]);
  }

  protected back(): void {
    void this.router.navigate(['/']);
  }
}
