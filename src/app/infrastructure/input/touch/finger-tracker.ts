import { Swipe } from '../../../core/domain/car/car';
import { SwipeDetector } from './swipe-detector';

/** Dedos que se siguen a la vez: uno para acelerar y otro para los swipes. */
export const MAX_FINGERS = 2;

/**
 * Sigue hasta dos dedos, cada uno con su propio detector de swipes. Mientras haya alguno en la
 * pantalla se acelera, así que se puede jugar con un dedo (mantener y deslizar, como siempre) o
 * con dos (uno quieto acelerando y el otro haciendo los swipes, sin soltar el primero).
 */
export class FingerTracker {
  private readonly fingers = new Map<number, SwipeDetector>();

  /** false si ya hay dos dedos (el tercero se ignora). */
  down(id: number, x: number, y: number): boolean {
    if (this.fingers.has(id) || this.fingers.size >= MAX_FINGERS) return false;
    const detector = new SwipeDetector();
    detector.down(x, y);
    this.fingers.set(id, detector);
    return true;
  }

  move(id: number, x: number, y: number, timeStamp: number): Swipe | null {
    return this.fingers.get(id)?.move(x, y, timeStamp) ?? null;
  }

  up(id: number): void {
    this.fingers.get(id)?.up();
    this.fingers.delete(id);
  }

  clear(): void {
    for (const id of [...this.fingers.keys()]) this.up(id);
  }

  /** Algún dedo en la pantalla: acelera. */
  get pressing(): boolean {
    return this.fingers.size > 0;
  }
}
