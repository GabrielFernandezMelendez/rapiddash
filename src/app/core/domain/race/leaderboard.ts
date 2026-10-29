export interface LeaderboardEntry {
  readonly position: number;
  readonly playerName: string;
  /** Segundos. */
  readonly time: number;
}

export const LEADERBOARD_SIZE = 10;
