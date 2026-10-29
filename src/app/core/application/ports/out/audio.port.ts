import { RacePhase } from '../../../domain/race/race';

/** Lo que el sonido necesita saber en cada fotograma. */
export interface AudioFrame {
  readonly phase: RacePhase;
  readonly accelerating: boolean;
  /** Velocidad entre 0 y 1 (1 = velocidad máxima). */
  readonly speedRatio: number;
}

/** Puerto de salida de sonido: música de carrera y motor. */
export abstract class AudioPort {
  /** Carga los sonidos y arranca la música. Nunca falla: sin audio, el juego sigue en silencio. */
  abstract start(): void;
  abstract update(frame: AudioFrame): void;
  abstract dispose(): void;
}
