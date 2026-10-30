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

  down(x: number, y: number): void {
    this.originX = this.lastX = x;
    this.originY = this.lastY = y;
    this.active = true;
    this.following = false;
  }

  /** `time` en ms (p. ej. `PointerEvent.timeStamp`). */
  move(x: number, y: number, time: number): Swipe | null {
    if (!this.active) return null;

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
    return dx > 0 ? 'right' : 'left';
  }

  up(): void {
    this.active = false;
    this.following = false;
  }
}
