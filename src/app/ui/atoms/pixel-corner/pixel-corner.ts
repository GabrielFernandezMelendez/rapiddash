import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { ButtonFxService } from '../../../shared/settings/button-fx.service';

/** Una celda de la esquina: su píxel, lo lejos que está de la punta (0-1) y en qué anda. */
interface Cell {
  readonly el: HTMLElement;
  readonly d: number;
  gone: boolean;
  busy: boolean;
}

/** Ritmos (ms) y cuánto falta de media: lento para que sea agradable de mirar. */
const TICK = [320, 620] as const;
const FALL = [950, 1350] as const;
const FALL_FAST = [560, 760] as const;
const MISSING = 0.22;
const MISSING_PRESSED = 0.6;
/** Solo se van las celdas hasta esta distancia de la punta. */
const REACH = 0.9;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const within = ([a, b]: readonly [number, number]) => rnd(a, b);

/**
 * Esquina de píxeles de los botones (Neon Coast). La esquina de arriba a la derecha del botón
 * es una rejilla de trozos con el mismo fondo y el mismo borde que el botón: entera no se
 * distingue. La velocidad le va arrancando píxeles sin parar (se encienden en neón, tiemblan y se
 * hunden en la pantalla girando) mientras otros vuelven en celdas al azar, a veces parpadeando,
 * y se apagan al encajar. Los de la punta se van mucho más. Al pulsar el botón, una ráfaga
 * arranca más de la mitad y al soltar se recompone.
 *
 * Va dentro de la forma inclinada del botón, junto a su `.fill`: recorta ese fondo y lo pinta en
 * los trozos. Colores del botón: `--rd-px-ring` (borde; `transparent` si no tiene),
 * `--rd-px-top` (sombra del borde de arriba) y `--rd-px-neon` (contorno al irse).
 * Apagado en Ajustes o con «Reducir movimiento»: no hace nada y la esquina queda normal.
 */
@Component({
  selector: 'rd-pixel-corner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: '',
  styles: `
    :host {
      position: absolute;
      top: 0;
      right: 0;
      pointer-events: none;
      perspective: 160px;
      perspective-origin: 0 100%;
    }
  `,
})
export class PixelCorner {
  /** Lado de cada píxel (px). */
  readonly cell = input(9);
  readonly cols = input(5);
  readonly rows = input(3);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly fx = inject(ButtonFxService);
  private cells: Cell[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private observer: ResizeObserver | undefined;
  private target = MISSING;
  private stopPress: (() => void) | undefined;
  private ready = false;

  constructor() {
    afterNextRender(() => {
      this.ready = true;
      this.sync();
    });
    effect(() => {
      this.fx.enabled();
      if (this.ready) this.sync();
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Enciende o apaga según Ajustes y «Reducir movimiento». */
  private sync(): void {
    const calm = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.stop();
    if (this.fx.enabled() && !calm) this.start();
  }

  private get fill(): HTMLElement | null {
    return this.host.parentElement?.querySelector<HTMLElement>(':scope > .fill') ?? null;
  }

  private start(): void {
    const fill = this.fill;
    if (!fill) return;
    const c = this.cell();
    const cols = this.cols();
    const rows = this.rows();
    const w = cols * c;
    const h = rows * c;
    this.host.style.width = `${w}px`;
    this.host.style.height = `${h}px`;
    // El fondo deja libre la esquina: la pintan los trozos
    fill.style.clipPath = `polygon(0 0, calc(100% - ${w}px) 0, calc(100% - ${w}px) ${h}px, 100% ${h}px, 100% 100%, 0 100%)`;
    const style = getComputedStyle(this.host);
    const ring = style.getPropertyValue('--rd-px-ring').trim() || 'transparent';
    const top = style.getPropertyValue('--rd-px-top').trim() || `inset 0 2px 0 ${ring}`;
    const neon = style.getPropertyValue('--rd-px-neon').trim() || ring;
    const lit = `inset 0 0 0 1.5px ${neon}, inset 0 0 0 0 transparent, 0 0 7px ${neon}`;
    const image = getComputedStyle(fill).backgroundImage;
    const tip = Math.hypot(cols - 1, rows - 1);
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k < cols; k++) {
        const el = document.createElement('i');
        // Un poco más grandes que la celda: sin rayas entre píxeles
        Object.assign(el.style, {
          position: 'absolute',
          display: 'block',
          willChange: 'transform, opacity',
          left: `${k * c}px`,
          top: `${r * c}px`,
          width: `${c + 0.6}px`,
          height: `${c + 0.6}px`,
          backgroundImage: image,
        });
        // Mismo borde que el botón donde toca (arriba y a la derecha)
        const edges = [r === 0 ? top : 'inset 0 0 0 transparent', k === cols - 1 ? `inset -2px 0 0 ${ring}` : 'inset 0 0 0 transparent', '0 0 0 transparent'];
        el.style.boxShadow = edges.join(',');
        el.dataset['calm'] = edges.join(',');
        el.dataset['lit'] = lit;
        this.host.append(el);
        this.cells.push({ el, d: Math.hypot(cols - 1 - k, r) / tip, gone: false, busy: false });
      }
    }
    this.place(fill);
    this.observer = new ResizeObserver(() => this.place(fill));
    this.observer.observe(fill);
    // Ráfaga al pulsar (como al acelerar) y se recompone al soltar
    const button = this.host.closest('button');
    if (button) {
      const press = () => this.burst();
      const release = () => (this.target = MISSING);
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointerleave', release);
      button.addEventListener('pointercancel', release);
      this.stopPress = () => {
        button.removeEventListener('pointerdown', press);
        button.removeEventListener('pointerup', release);
        button.removeEventListener('pointerleave', release);
        button.removeEventListener('pointercancel', release);
      };
    }
    this.timer = setTimeout(() => this.tick(), rnd(0, 800));
  }

  /** Cada trozo enseña su parte del fondo del botón. */
  private place(fill: HTMLElement): void {
    const c = this.cell();
    const width = fill.offsetWidth;
    const height = fill.offsetHeight;
    const offset = width - this.cols() * c;
    for (const cell of this.cells) {
      const left = parseFloat(cell.el.style.left);
      const top = parseFloat(cell.el.style.top);
      cell.el.style.backgroundSize = `${width}px ${height}px`;
      cell.el.style.backgroundPosition = `${-(offset + left)}px ${-top}px`;
    }
  }

  private stop(): void {
    clearTimeout(this.timer);
    this.observer?.disconnect();
    this.stopPress?.();
    this.stopPress = undefined;
    for (const cell of this.cells) {
      cell.el.getAnimations().forEach((a) => a.cancel());
      cell.el.remove();
    }
    this.cells = [];
    this.target = MISSING;
    const fill = this.fill;
    if (fill) fill.style.clipPath = '';
  }

  /** Los de la punta se van mucho más que los de dentro. */
  private weight(cell: Cell): number {
    return Math.exp(-cell.d * 4);
  }

  private pick(list: Cell[]): Cell {
    let t = list.reduce((sum, c) => sum + this.weight(c), 0) * Math.random();
    for (const c of list) {
      t -= this.weight(c);
      if (t <= 0) return c;
    }
    return list[list.length - 1];
  }

  private tick(): void {
    const reachable = this.cells.filter((c) => c.d < REACH);
    const free = reachable.filter((c) => !c.busy);
    const gone = free.filter((c) => c.gone);
    const here = free.filter((c) => !c.gone);
    const missing = reachable.filter((c) => c.gone).length / reachable.length;
    // Por debajo de lo que toca, se arranca uno; vuelve otro al azar (sin preferencia de sitio)
    if (here.length && (missing < this.target || Math.random() < 0.35)) this.detach(this.pick(here), false);
    if (gone.length && (missing > this.target * 0.6 || Math.random() < 0.3)) {
      this.restore(gone[Math.floor(Math.random() * gone.length)]);
    }
    this.timer = setTimeout(() => this.tick(), within(TICK));
  }

  private burst(): void {
    this.target = MISSING_PRESSED;
    for (const c of this.cells) {
      if (c.d >= REACH || c.busy || c.gone || Math.random() > 0.65) continue;
      setTimeout(() => !c.busy && !c.gone && this.detach(c, true), rnd(0, 260));
    }
  }

  /** Se enciende en neón, tiembla, se hunde en la pantalla girando y se apaga. */
  private detach(cell: Cell, fast: boolean): void {
    cell.busy = true;
    cell.gone = true;
    const { calm, lit } = cell.el.dataset;
    const sink = `translate3d(${rnd(4, 26)}px, ${-rnd(2, 22)}px, -420px) rotate(${rnd(-150, 150)}deg)`;
    cell.el
      .animate(
        [
          { transform: 'none', opacity: 1, boxShadow: calm },
          { transform: `translate(${rnd(-1, 1)}px, ${rnd(-1, 1)}px)`, opacity: 1, boxShadow: lit, offset: 0.14 },
          { transform: sink, opacity: 0, boxShadow: lit },
        ],
        { duration: within(fast ? FALL_FAST : FALL), easing: 'cubic-bezier(.55,0,.95,.45)', fill: 'forwards' },
      )
      .finished.then(() => (cell.busy = false), () => undefined);
  }

  /** Vuelve encendido (a veces parpadeando, como si costara) y se apaga al encajar. */
  private restore(cell: Cell): void {
    cell.busy = true;
    cell.gone = false;
    const { calm, lit } = cell.el.dataset;
    const flicker = Math.random() < 0.5;
    const frames: Keyframe[] = flicker
      ? [
          { transform: 'scale(.3)', opacity: 0, boxShadow: lit },
          { transform: 'scale(1.15)', opacity: 1, boxShadow: lit, offset: 0.25 },
          { transform: 'scale(1)', opacity: 0.1, boxShadow: lit, offset: 0.45 },
          { transform: 'scale(1.08)', opacity: 1, boxShadow: lit, offset: 0.7 },
          { transform: 'none', opacity: 1, boxShadow: calm },
        ]
      : [
          { transform: 'translate3d(0, 0, -140px) scale(.5)', opacity: 0, boxShadow: lit },
          { transform: 'scale(1.12)', opacity: 1, boxShadow: lit, offset: 0.6 },
          { transform: 'none', opacity: 1, boxShadow: calm },
        ];
    cell.el
      .animate(frames, { duration: flicker ? 620 : 440, easing: 'ease-out', fill: 'forwards' })
      .finished.then(() => (cell.busy = false), () => undefined);
  }
}
