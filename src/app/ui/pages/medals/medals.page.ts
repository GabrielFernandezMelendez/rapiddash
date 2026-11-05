import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { Medal, MEDALS, medalFor, MedalTargets, medalTargets, nextMedal } from '../../../core/domain/medals/medals';
import { autopilotTime } from '../../../core/domain/race/autopilot';
import { CIRCUIT_MAPS, RaceMap, trackOf } from '../../../core/domain/track/race-map';
import { formatTime, NO_TIME } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { MedalCoin } from '../../molecules/medal-coin/medal-coin';
import { MEDAL_NAMES } from '../../organisms/hud-juice/hud-juice';

interface MedalRow {
  readonly map: RaceMap;
  readonly targets: MedalTargets;
  readonly best: number | null;
  readonly medal: Medal | null;
  readonly next: Medal | null;
  readonly gap: string | null;
}

/** Mejor tiempo de mentira para el mockup (?mock=1): variado para ver todas las medallas. */
const MOCK_FACTORS = [0.95, 1.0, 1.05, 1.12, 1.25, null, 0.99, 1.07, 1.16, null, 1.03, 1.2];

/**
 * MOCKUP de la pantalla Medallas: resumen arriba (cuántas de cada) y la lista de circuitos con su
 * medalla, los cuatro tiempos objetivo y cuánto falta para la siguiente. Tocar un mapa = correrlo.
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
  protected readonly rows = signal<MedalRow[]>([]);
  protected readonly medals = [...MEDALS].reverse();
  protected readonly names = MEDAL_NAMES;
  protected readonly counts = computed(() => {
    const c: Record<Medal, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    // Tener oro cuenta también como plata y bronce (como en Race Time)
    for (const r of this.rows()) {
      if (!r.medal) continue;
      for (const m of MEDALS.slice(0, MEDALS.indexOf(r.medal) + 1)) c[m]++;
    }
    return c;
  });
  protected readonly total = computed(() => this.rows().length);
  protected readonly golds = computed(() => this.counts().gold);

  async ngOnInit(): Promise<void> {
    const rows: MedalRow[] = [];
    for (const [i, map] of CIRCUIT_MAPS.entries()) {
      const targets = medalTargets(autopilotTime(trackOf(map)));
      const stored = (await this.bestRuns.get(map.id))?.time ?? null;
      const f = MOCK_FACTORS[i % MOCK_FACTORS.length];
      const best = this.mock() ? (f === null ? null : targets.gold * f) : stored;
      const medal = medalFor(best, targets);
      const next = nextMedal(medal);
      const gap = next && best !== null ? '−' + formatTime(best - targets[next]) : null;
      rows.push({ map, targets, best, medal, next, gap });
    }
    this.rows.set(rows);
  }

  protected time(t: number | null): string {
    return t === null ? NO_TIME : formatTime(t);
  }

  protected has(row: MedalRow, m: Medal): boolean {
    return row.medal !== null && MEDALS.indexOf(row.medal) >= MEDALS.indexOf(m);
  }

  protected play(row: MedalRow): void {
    void this.router.navigate(['/race', row.map.id]);
  }

  protected back(): void {
    void this.router.navigate(['/']);
  }
}
