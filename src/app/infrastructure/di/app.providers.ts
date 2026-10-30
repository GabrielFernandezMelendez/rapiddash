import { Provider } from '@angular/core';
import { BestRunRepository } from '../../core/application/ports/out/best-run.repository';
import { LeaderboardRepository } from '../../core/application/ports/out/leaderboard.repository';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import { EmptyLeaderboardRepository } from '../persistence/empty/empty-leaderboard.repository';
import { LocalBestRunRepository } from '../persistence/local/local-best-run.repository';
import { LocalSettingsRepository } from '../persistence/local/local-settings.repository';

// Aquí se decide qué adaptador implementa cada puerto global.
// Los de la carrera están en race.providers.ts para que Three.js se cargue de forma diferida.

/** Adaptadores globales: viven toda la sesión. */
export function provideAppAdapters(): Provider[] {
  return [
    { provide: BestRunRepository, useClass: LocalBestRunRepository },
    { provide: LeaderboardRepository, useClass: EmptyLeaderboardRepository },
    { provide: SettingsRepository, useClass: LocalSettingsRepository },
  ];
}
