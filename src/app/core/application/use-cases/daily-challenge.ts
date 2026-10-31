import {
  canRace,
  currentAttempts,
  DailyAttempts,
  grantAdAttempts,
  useAttempt,
  waitRemaining,
} from '../../domain/daily/daily-attempts';
import { dailyBoardId, dailyKey, dailyMapId, msUntilNextDay } from '../../domain/daily/daily-map';
import { AdsPort } from '../ports/out/ads.port';
import { DailyAttemptsRepository } from '../ports/out/daily-attempts.repository';

export interface DailyToday {
  readonly key: string;
  /** Ranking del día (se guarda como un mapa más). */
  readonly boardId: string;
  readonly mapId: string;
  /** Hasta el próximo mapa. */
  readonly msLeft: number;
}

/** Mapa del día: qué mapa toca, los intentos y los anuncios para conseguir más. */
export class DailyChallenge {
  constructor(
    private readonly attempts: DailyAttemptsRepository,
    private readonly ads: AdsPort,
    private readonly now: () => Date = () => new Date(),
  ) {}

  today(mapIds: readonly string[]): DailyToday {
    const now = this.now();
    const key = dailyKey(now);
    return { key, boardId: dailyBoardId(key), mapId: dailyMapId(key, mapIds), msLeft: msUntilNextDay(now) };
  }

  state(): DailyAttempts {
    const now = this.now();
    const state = currentAttempts(this.attempts.get(), dailyKey(now), now.getTime());
    this.attempts.save(state);
    return state;
  }

  canRace(): boolean {
    return canRace(this.state());
  }

  /** Al empezar una carrera del mapa del día. false si no quedan intentos. */
  startAttempt(): boolean {
    const state = this.state();
    if (!canRace(state)) return false;
    this.attempts.save(useAttempt(state, this.now().getTime()));
    return true;
  }

  /** Ver un anuncio: si se completa, 3 intentos más. */
  async watchAd(): Promise<boolean> {
    if (!(await this.ads.showRewarded())) return false;
    this.attempts.save(grantAdAttempts(this.state()));
    return true;
  }

  waitRemaining(): number {
    return waitRemaining(this.state(), this.now().getTime());
  }
}
