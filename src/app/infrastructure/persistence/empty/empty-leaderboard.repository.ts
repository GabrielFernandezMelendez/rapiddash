import { LeaderboardRepository } from '../../../core/application/ports/out/leaderboard.repository';
import { LeaderboardEntry } from '../../../core/domain/race/leaderboard';

/** Clasificación vacía hasta que exista el modo online (Firebase). */
export class EmptyLeaderboardRepository extends LeaderboardRepository {
  async top(): Promise<LeaderboardEntry[]> {
    return [];
  }
}
