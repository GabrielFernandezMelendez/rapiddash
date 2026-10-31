import { DailyAttempts, WAIT_MS } from '../../domain/daily/daily-attempts';
import { AdsPort } from '../ports/out/ads.port';
import { DailyAttemptsRepository } from '../ports/out/daily-attempts.repository';
import { DailyChallenge } from './daily-challenge';

class MemoryAttempts extends DailyAttemptsRepository {
  value: DailyAttempts | null = null;
  get() {
    return this.value;
  }
  save(state: DailyAttempts) {
    this.value = state;
  }
}

class FakeAds extends AdsPort {
  watched = true;
  async showRewarded() {
    return this.watched;
  }
}

const MAPS = ['bay', 'canyon', 'summit'];

describe('DailyChallenge', () => {
  let now: Date;
  let repo: MemoryAttempts;
  let ads: FakeAds;
  let daily: DailyChallenge;

  beforeEach(() => {
    now = new Date('2026-10-31T10:00:00Z');
    repo = new MemoryAttempts();
    ads = new FakeAds();
    daily = new DailyChallenge(repo, ads, () => now);
  });

  it('mapa y ranking de hoy', () => {
    const today = daily.today(MAPS);
    expect(today.boardId).toBe('daily-2026-10-31');
    expect(MAPS).toContain(today.mapId);
    expect(today.msLeft).toBe(13 * 60 * 60 * 1000);
  });

  it('dos carreras gratis y luego hay que esperar o ver un anuncio', async () => {
    expect(daily.startAttempt()).toBe(true);
    expect(daily.startAttempt()).toBe(true);
    expect(daily.startAttempt()).toBe(false);
    expect(daily.waitRemaining()).toBe(WAIT_MS);
    expect(await daily.watchAd()).toBe(true);
    expect([daily.startAttempt(), daily.startAttempt(), daily.startAttempt()]).toEqual([true, true, true]);
    expect(daily.canRace()).toBe(false);
  });

  it('si el anuncio no se completa, no hay recompensa', async () => {
    daily.startAttempt();
    daily.startAttempt();
    ads.watched = false;
    expect(await daily.watchAd()).toBe(false);
    expect(daily.canRace()).toBe(false);
  });

  it('tras 3 h de espera vuelve a haber intentos', () => {
    daily.startAttempt();
    daily.startAttempt();
    now = new Date(now.getTime() + WAIT_MS);
    expect(daily.canRace()).toBe(true);
  });
});
