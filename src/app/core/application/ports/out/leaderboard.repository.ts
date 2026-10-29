import { LeaderboardEntry } from '../../../domain/race/leaderboard';

/** Clasificación global por mapa. Hoy vacía; más adelante, Firebase. */
export abstract class LeaderboardRepository {
  abstract top(mapId: string, limit: number): Promise<LeaderboardEntry[]>;
}
