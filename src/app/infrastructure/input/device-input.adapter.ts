import { InputPort } from '../../core/application/ports/out/input.port';
import { DriveInput, Swipe } from '../../core/domain/car/car';
import { SwipeDetector } from './touch/swipe-detector';

const KEY_SWIPES: Record<string, Swipe> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

/**
 * Controles del juego:
 * - Móvil: mantener el dedo acelera; deslizar a un lado cambia de carril (o gira en un cruce).
 * - Ordenador: espacio acelera, flechas ← → equivalen a los swipes.
 *   Arrastrar con el ratón también funciona, porque se usan Pointer Events.
 */
export class DeviceInputAdapter extends InputPort {
  private surface: HTMLElement | null = null;
  private readonly detector = new SwipeDetector();
  private readonly queue: Swipe[] = [];
  private pointerId: number | null = null;
  private keyThrottle = false;

  attach(surface: HTMLElement): void {
    this.dispose();
    this.surface = surface;
    surface.addEventListener('pointerdown', this.onPointerDown);
    surface.addEventListener('pointermove', this.onPointerMove);
    surface.addEventListener('pointerup', this.onPointerUp);
    surface.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  read(): DriveInput {
    const swipes = this.queue.splice(0, this.queue.length);
    return { throttle: this.pointerId !== null || this.keyThrottle, swipes };
  }

  dispose(): void {
    const s = this.surface;
    if (s) {
      s.removeEventListener('pointerdown', this.onPointerDown);
      s.removeEventListener('pointermove', this.onPointerMove);
      s.removeEventListener('pointerup', this.onPointerUp);
      s.removeEventListener('pointercancel', this.onPointerUp);
    }
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.surface = null;
    this.onBlur();
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    // Los botones de la interfaz (salir, repetir...) no cuentan como acelerar
    if ((e.target as HTMLElement | null)?.closest('button')) return;
    if (this.pointerId !== null) return;
    this.pointerId = e.pointerId;
    this.detector.down(e.clientX, e.clientY);
    this.surface?.setPointerCapture?.(e.pointerId);
  };

  private readonly onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    const swipe = this.detector.move(e.clientX, e.clientY, e.timeStamp);
    if (swipe) this.queue.push(swipe);
  };

  private readonly onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.detector.up();
  };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      this.keyThrottle = true;
      return;
    }
    const swipe = KEY_SWIPES[e.key];
    if (!swipe) return;
    e.preventDefault();
    if (!e.repeat) this.queue.push(swipe);
  };

  private readonly onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.keyThrottle = false;
  };

  // Si la ventana pierde el foco soltamos todo para que el coche no siga acelerando
  private readonly onBlur = () => {
    this.keyThrottle = false;
    this.pointerId = null;
    this.detector.up();
  };
}
