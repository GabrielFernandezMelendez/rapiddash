import { RacePhase } from '../../../domain/race/race';
import { Aesthetic } from '../../../domain/settings/aesthetic';
import { VolumeChannel, Volumes } from '../../../domain/settings/volume';

/** Lo que el sonido necesita saber en cada fotograma. */
export interface AudioFrame {
  readonly phase: RacePhase;
  readonly accelerating: boolean;
  /** Velocidad entre 0 y 1 (1 = velocidad máxima). */
  readonly speedRatio: number;
}

/** Puerto de salida de sonido: música de carrera y motor. */
export abstract class AudioPort {
  /**
   * Carga los sonidos de la estética y arranca una canción al azar. Nunca falla: sin audio, el
   * juego sigue en silencio.
   */
  abstract start(aesthetic: Aesthetic): void;
  /** Carrera nueva («Repetir»): otra canción al azar. */
  abstract nextSong(): void;
  /** Volumen de música y efectos elegido en Ajustes. */
  abstract setVolumes(volumes: Volumes): void;
  /** Ejemplo corto de un canal (al soltar el slider en Ajustes). */
  abstract preview(channel: VolumeChannel, volumes: Volumes, aesthetic: Aesthetic): void;
  abstract update(frame: AudioFrame): void;
  abstract dispose(): void;
}
