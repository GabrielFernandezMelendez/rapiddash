import { Provider } from '@angular/core';
import { AuthPort } from '../../core/application/ports/out/auth.port';
import { BestRunRepository } from '../../core/application/ports/out/best-run.repository';
import { LeaderboardRepository } from '../../core/application/ports/out/leaderboard.repository';
import { ProfileRepository } from '../../core/application/ports/out/profile.repository';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import { CachedProfileRepository } from '../firebase/cached-profile.repository';
import { LazyFirebaseAuth } from '../firebase/lazy-firebase-auth';
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
    // Firebase se descarga de forma diferida dentro de estos adaptadores
    { provide: AuthPort, useClass: LazyFirebaseAuth },
    { provide: ProfileRepository, useClass: CachedProfileRepository },
  ];
}
