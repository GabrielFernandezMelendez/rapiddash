import { Swipe } from '../../../core/domain/car/car';

/** Píxeles que hay que recorrer para que el gesto cuente como swipe. */
export const SWIPE_THRESHOLD = 28;
/**
 * Tras un swipe, milisegundos que el dedo tiene que estar quieto para poder hacer otro.
 * Así un deslizamiento largo cuenta como un solo swipe (un carril), aunque recorra mucho.
 */
export const SWIPE_REST_MS = 90;
/** Movimiento (px) por debajo del cual el dedo se considera quieto. */
const STILL_PX = 3;
/** Recorrido (px) hacia abajo que pide un swipe de reinicio: largo, para no hacerlo sin querer. */
export const RESTART_SWIPE_PX = 160;
/** Tiempo máximo (ms) para recorrerlo: un dedo que resbala despacio no reinicia. */
export const RESTART_SWIPE_MS = 450;
/** Desvío lateral máximo respecto a lo recorrido hacia abajo: tiene que ir casi recto. */
const RESTART_MAX_SLANT = 0.5;

/** Lo que puede salir de un gesto: un swipe lateral o la petición de reiniciar. */
export type Gesture = Swipe | 'restart';

/**
 * Convierte el movimiento de un dedo en swipes.
 * El dedo sigue pulsado (acelera), así que se pueden encadenar swipes sin levantarlo, pero cada
 * gesto cuenta una sola vez: tras un swipe el origen sigue al dedo hasta que este se para un
 * instante o se levanta.
 */
export class SwipeDetector {
  private originX = 0;
  private originY = 0;
  private active = false;
  /** Tras un swipe: el origen sigue al dedo hasta que se para. */
  private following = false;
  private lastX = 0;
  private lastY = 0;
  private lastMoveAt = 0;
  /** Inicio del posible swipe de reinicio (`restartAt` null: empieza con el próximo movimiento). */
  private restartX = 0;
  private restartY = 0;
  private restartAt: number | null = null;
  /** Cada vez que se pone el dedo se puede reiniciar una sola vez. */
  private restartDone = false;

  down(x: number, y: number): void {
    this.originX = this.lastX = x;
    this.originY = this.lastY = y;
    this.active = true;
    this.following = false;
    this.restartX = x;
    this.restartY = y;
    this.restartAt = null;
    this.restartDone = false;
  }

  /** `time` en ms (p. ej. `PointerEvent.timeStamp`). */
  move(x: number, y: number, time: number): Gesture | null {
    if (!this.active) return null;
    if (this.isRestart(x, y, time)) return 'restart';

    const moved = Math.hypot(x - this.lastX, y - this.lastY) >= STILL_PX;
    if (this.following) {
      // El dedo se paró un instante: a partir de aquí empieza un gesto nuevo
      if (time - this.lastMoveAt >= SWIPE_REST_MS) this.following = false;
      else if (moved) {
        this.originX = x;
        this.originY = y;
      }
    }
    if (moved) {
      this.lastX = x;
      this.lastY = y;
      this.lastMoveAt = time;
    }
    if (this.following) return null;

    const dx = x - this.originX;
    const dy = y - this.originY;
    if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return null;

    this.originX = x;
    this.originY = y;
    // Deslizar en vertical no hace nada
    if (Math.abs(dx) <= Math.abs(dy)) return null;
    this.following = true;
    // Un swipe lateral no se puede convertir en reinicio: el recorrido empieza de cero
    this.restartX = x;
    this.restartY = y;
    this.restartAt = time;
    return dx > 0 ? 'right' : 'left';
  }

  up(): void {
    this.active = false;
    this.following = false;
  }

  /** Swipe largo, rápido y casi recto hacia abajo. */
  private isRestart(x: number, y: number, time: number): boolean {
    if (this.restartDone) return false;
    if (this.restartAt === null) this.restartAt = time;
    else if (time - this.restartAt > RESTART_SWIPE_MS) {
      // Demasiado lento (o el dedo estaba quieto): el recorrido empieza aquí
      this.restartX = x;
      this.restartY = y;
      this.restartAt = time;
    }
    const down = y - this.restartY;
    if (down < RESTART_SWIPE_PX) return false;
    if (Math.abs(x - this.restartX) > down * RESTART_MAX_SLANT) return false;
    this.restartDone = true;
    return true;
  }
}
