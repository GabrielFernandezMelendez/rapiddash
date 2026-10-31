import { DailyAttemptsRepository } from '../../../core/application/ports/out/daily-attempts.repository';
import { DailyAttempts } from '../../../core/domain/daily/daily-attempts';
import { readJson, writeJson } from './safe-storage';

const KEY = 'rapiddash.daily.attempts';

/** Intentos del mapa del día en este móvil (de momento nos fiamos del dispositivo). */
export class LocalDailyAttemptsRepository extends DailyAttemptsRepository {
  get(): DailyAttempts | null {
    const s = readJson<DailyAttempts>(KEY);
    const valid =
      s &&
      typeof s.day === 'string' &&
      typeof s.used === 'number' &&
      typeof s.allowed === 'number' &&
      (s.exhaustedAt === null || typeof s.exhaustedAt === 'number');
    return valid ? s : null;
  }

  save(state: DailyAttempts): void {
    writeJson(KEY, state);
  }
}
