import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { dailyBoardId, dailyKey } from '../../../core/domain/daily/daily-map';
import {
  DailyMedal,
  dailyMapOf,
  dailyMedals,
  medalCounts,
  recentDayKeys,
} from '../../../core/domain/medals/daily-medals';
import { mapMedalTargets } from '../../../core/domain/medals/map-medals';
import { Medal, MEDALS, nextMedal } from '../../../core/domain/medals/medals';
import { ALL_MAPS } from '../../../core/domain/track/race-map';
import { formatTime } from '../../../shared/format-time';
import { GarageService } from '../../../shared/garage/garage.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { MedalCoin } from '../../molecules/medal-coin/medal-coin';

/** Días hacia atrás que se miran en el historial. */
const HISTORY_DAYS = 60;
/** Mejores tiempos de mentira (?mock=1, solo en debug): variados para ver todas las medallas. */
const MOCK_FACTORS = [0.99, 1.05, null, 1.12, 0.96, 1.25, null, 1.0, 1.07, 1.16, null, 1.03];

interface DayRow extends DailyMedal {
  readonly today: boolean;
  readonly label: string;
  readonly next: Medal | null;
  readonly gap: string | null;
}

/**
 * Medallas: historial del mapa del día. Arriba, cuántas de cada; debajo, cada día jugado con su
 * circuito, la medalla que sacó mi mejor tiempo y sus cuatro tiempos. El de hoy aún se puede
 * mejorar: lleva lo que falta para la siguiente y el botón para correrlo.
 */
@Component({
  selector: 'rd-medals-page',
  imports: [Button, MedalCoin, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './medals.page.html',
  styleUrl: './medals.page.scss',
})
export class MedalsPage implements OnInit {
  readonly mock = input<string | undefined>();
  private readonly router = inject(Router);
  private readonly bestRuns = inject(BestRunRepository);
  private readonly garage = inject(GarageService);
  private readonly i18n = inject(I18nService);
  protected readonly rows = signal<DayRow[]>([]);
  protected readonly loaded = signal(false);
  protected readonly medals = [...MEDALS].reverse();
  protected readonly counts = computed(() => medalCounts(this.rows()));
  protected readonly played = computed(() => this.rows().length);
  /** Circuito de hoy, aunque aún no lo haya corrido. */
  private readonly todayKey = dailyKey(new Date());
  protected readonly todayMap = dailyMapOf(this.todayKey, ALL_MAPS);
  protected readonly playedToday = computed(() => this.rows()[0]?.today ?? false);

  async ngOnInit(): Promise<void> {
    const keys = recentDayKeys(this.todayKey, HISTORY_DAYS);
    const mock = this.mock() && this.garage.debug();
    const bests = new Map<string, number>();
    if (mock) {
      keys.slice(0, 20).forEach((k, i) => {
        const f = MOCK_FACTORS[i % MOCK_FACTORS.length];
        const map = dailyMapOf(k, ALL_MAPS);
        const gold = map ? mapMedalTargets(map)?.gold : undefined;
        if (f !== null && gold) bests.set(k, gold * f);
      });
    } else {
      const runs = await Promise.all(keys.map((k) => this.bestRuns.get(dailyBoardId(k))));
      runs.forEach((r, i) => r && bests.set(keys[i], r.time));
    }
    const days = dailyMedals(keys, ALL_MAPS, (k) => bests.get(k) ?? null);
    this.rows.set(
      days.map((d) => {
        const next = nextMedal(d.medal);
        return {
          ...d,
          today: d.key === this.todayKey,
          label: this.dayLabel(d.key),
          next,
          gap: next ? formatTime(d.best - d.targets[next]) : null,
        };
      }),
    );
    this.loaded.set(true);
  }

  protected time(t: number): string {
    return formatTime(t);
  }

  protected has(row: DayRow, m: Medal): boolean {
    return row.medal !== null && MEDALS.indexOf(row.medal) >= MEDALS.indexOf(m);
  }

  protected playToday(): void {
    void this.router.navigate(['/daily']);
  }

  protected back(): void {
    void this.router.navigate(['/']);
  }

  /** «Hoy», «Ayer» o «3 nov». */
  private dayLabel(key: string): string {
    const keys = recentDayKeys(this.todayKey, 2);
    if (key === keys[0]) return this.i18n.t('medals.today');
    if (key === keys[1]) return this.i18n.t('medals.yesterday');
    const [y, m, d] = key.split('-').map(Number);
    return new Intl.DateTimeFormat(this.i18n.language(), { day: 'numeric', month: 'short' }).format(
      new Date(Date.UTC(y, m - 1, d, 12)),
    );
  }
}
