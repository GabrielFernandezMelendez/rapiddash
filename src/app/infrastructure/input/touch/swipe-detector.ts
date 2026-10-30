import { Swipe } from '../../../core/domain/car/car';

/** Píxeles que hay que recorrer para que el gesto cuente como swipe. */
export const SWIPE_THRESHOLD = 28;

/**
 * Convierte el movimiento de un dedo en swipes.
 * Tras cada swipe el origen se mueve al punto actual, así un mismo gesto puede encadenar
 * varios cambios de carril sin levantar el dedo.
 */
export class SwipeDetector {
  private originX = 0;
  private originY = 0;
  private active = false;

  down(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
    this.active = true;
  }

  move(x: number, y: number): Swipe | null {
    if (!this.active) return null;
    const dx = x - this.originX;
    const dy = y - this.originY;
    if (Math.hypot(dx, dy) < SWIPE_THRESHOLD) return null;

    this.originX = x;
    this.originY = y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    // Deslizar en vertical no hace nada
    return null;
  }

  up(): void {
    this.active = false;
  }
}
