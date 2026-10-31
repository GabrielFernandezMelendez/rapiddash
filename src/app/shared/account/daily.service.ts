import { inject, Injectable } from '@angular/core';
import { AdsPort } from '../../core/application/ports/out/ads.port';
import { DailyAttemptsRepository } from '../../core/application/ports/out/daily-attempts.repository';
import { DailyChallenge, DailyToday } from '../../core/application/use-cases/daily-challenge';
import { Trophy, trophyFor } from '../../core/domain/daily/daily-map';
import { RankingView } from '../../core/domain/race/ranking';
import { findMap, RaceMap } from '../../core/domain/track/race-map';
import { RankingService } from './ranking.service';

/** Mi resultado de hoy: copa y puesto, o null si aún no he corrido. */
export interface DailyStanding {
  readonly trophy: Trophy;
  readonly rank: number;
  readonly total: number;
  readonly time: number;
}

/** Mapa del día para las pantallas: qué mapa toca, mi copa y los intentos. */
@Injectable({ providedIn: 'root' })
export class DailyService {
  private readonly ranking = inject(RankingService);
  private readonly challenge = new DailyChallenge(inject(DailyAttemptsRepository), inject(AdsPort));

  today(maps: readonly RaceMap[]): DailyToday & { map: RaceMap } {
    const today = this.challenge.today(maps.map((m) => m.id));
    return { ...today, map: findMap(today.mapId)! };
  }

  load(boardId: string): Promise<RankingView> {
    return this.ranking.load(boardId);
  }

  standing(view: RankingView): DailyStanding | null {
    if (!view.me) return null;
    const total = Math.max(view.total ?? view.me.rank, view.me.rank);
    return {
      trophy: trophyFor(view.me.rank, total),
      rank: view.me.rank,
      total,
      time: view.me.record.time,
    };
  }

  canRace(): boolean {
    return this.challenge.canRace();
  }

  startAttempt(): boolean {
    return this.challenge.startAttempt();
  }

  watchAd(): Promise<boolean> {
    return this.challenge.watchAd();
  }

  waitRemaining(): number {
    return this.challenge.waitRemaining();
  }
}
