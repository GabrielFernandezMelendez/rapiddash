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
  /** Por dónde ha pasado el dedo en los últimos RESTART_SWIPE_MS: de ahí se mide el reinicio. */
  private trail: { x: number; y: number; time: number }[] = [];
  /** Tras un reinicio, hasta cuándo se ignora: el mismo deslizamiento no lo pide otra vez. */
  private restartBlockedUntil = -Infinity;

  down(x: number, y: number): void {
    this.originX = this.lastX = x;
    this.originY = this.lastY = y;
    this.active = true;
    this.following = false;
    this.trail = [{ x, y, time: -Infinity }];
    this.restartBlockedUntil = -Infinity;
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
    this.trail = [{ x, y, time }];
    return dx > 0 ? 'right' : 'left';
  }

  up(): void {
    this.active = false;
    this.following = false;
  }

  /**
   * Swipe largo, rápido y casi recto hacia abajo, medido desde cualquier punto de los últimos
   * RESTART_SWIPE_MS: un dedo pulsado nunca está quieto del todo, así que el swipe no tiene un
   * inicio claro y puede llegar en cualquier momento de la carrera.
   */
  private isRestart(x: number, y: number, time: number): boolean {
    const last = this.trail[this.trail.length - 1];
    this.trail = this.trail.filter((p) => time - p.time <= RESTART_SWIPE_MS);
    // Sin movimiento reciente, el dedo estaba parado donde se quedó: de ahí sale el swipe
    if (!this.trail.length && last) this.trail.push({ ...last, time });
    if (time < this.restartBlockedUntil) {
      this.trail = [{ x, y, time }];
      return false;
    }
    const isSwipe = this.trail.some((p) => {
      const down = y - p.y;
      return down >= RESTART_SWIPE_PX && Math.abs(x - p.x) <= down * RESTART_MAX_SLANT;
    });
    this.trail.push({ x, y, time });
    if (!isSwipe) return false;
    this.trail = [{ x, y, time }];
    this.restartBlockedUntil = time + RESTART_SWIPE_MS;
    return true;
  }
}
