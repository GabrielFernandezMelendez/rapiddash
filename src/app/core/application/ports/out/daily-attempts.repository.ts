import { DailyAttempts } from '../../../domain/daily/daily-attempts';

/** Intentos del mapa del día de este dispositivo. */
export abstract class DailyAttemptsRepository {
  abstract get(): DailyAttempts | null;
  abstract save(state: DailyAttempts): void;
}
