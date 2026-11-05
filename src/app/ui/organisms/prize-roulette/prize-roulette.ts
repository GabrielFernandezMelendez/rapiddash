import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Prize } from '../../../core/domain/garage/garage';
import {
  PRIZE_REEL_WINNER,
  prizeAccent,
  REEL_SETTLE_MS,
  REEL_SPIN_MS,
  reelPosition,
} from '../../../core/domain/garage/prize-reel';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { PrizeArt } from '../../molecules/prize-art/prize-art';

type Step = 'cube' | 'spin' | 'reveal';

/** Lo que dura el cubo antes de estallar y la revelación antes de ir al garaje (ms). */
const CUBE_MS = 800;
const REVEAL_MS = 2200;
/** Separación entre premios, respecto al ancho de la pantalla. */
const ITEM_SPACING = 0.64;
/** Los móviles grandes y el PC no separan más los premios que un móvil normal. */
const MAX_WIDTH = 480;

/**
 * Ruleta del cubo azul, sobre los resultados: el cubo estalla, pasa la cinta de siluetas, frena con
 * rebote y el premio se pinta. Tocar o Escape salta al siguiente paso. Al acabar avisa con
 * `finished`: el premio ya estaba guardado, así que nada se pierde si se cierra la app a medias.
 */
@Component({
  selector: 'rd-prize-roulette',
  imports: [PrizeArt, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-step]': 'step()',
    '[style.--rd-prize-paint]': 'accent()',
    '(click)': 'skip()',
    '(document:keydown.escape)': 'skip()',
  },
  template: `
    <div class="dim"></div>
    <div class="rays"></div>
    <div class="prompt">
      <small>{{ 'cube.label' | t }}</small>
      <strong>{{ 'cube.whichOne' | t }}</strong>
    </div>
    <div class="cube"><span></span></div>
    <div class="reel" #reelEl>
      @for (item of reel(); track $index) {
        <div class="item" [class.win]="$index === winner && step() === 'reveal'">
          <rd-prize-art class="sil" [prize]="item" />
          @if ($index === winner) {
            <rd-prize-art class="col" [prize]="item" [painted]="true" />
          }
        </div>
      }
    </div>
    <div class="frame" #frame></div>
    <div class="title" role="status">
      @if (step() === 'reveal') {
        <em>{{ 'cube.unlocked' | t }}</em>
        <strong>{{ name() | t }}</strong>
      }
    </div>
    <div class="going">
      <span>{{ 'cube.going' | t }}</span>
      <i></i>
    </div>
    <div class="skip">{{ 'cube.skip' | t }}</div>
    <div class="flash" #flash></div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 30;
      overflow: hidden;
      container-type: inline-size;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    }
    .dim {
      position: absolute;
      inset: 0;
      background: rgb(8 2 22 / 0.86);
      backdrop-filter: blur(3px);
    }
    .prompt {
      position: absolute;
      top: calc(9% + env(safe-area-inset-top, 0px));
      left: 0;
      right: 0;
      text-align: center;
      transition: opacity 0.25s;
    }
    :host([data-step='reveal']) .prompt {
      opacity: 0;
    }
    .prompt small {
      display: block;
      font-family: var(--rd-font-hud-time);
      font-size: 12px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #9fe8ff;
      text-shadow: 0 0 10px #2d7bff;
    }
    .prompt strong {
      display: block;
      margin-top: 4px;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: clamp(24px, 7.6cqw, 34px);
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--rd-chalk);
    }

    /* Cubo: el mismo azul que en la pista */
    .cube {
      position: absolute;
      left: 50%;
      top: 40%;
      width: 80px;
      height: 80px;
      margin: -40px;
      display: grid;
      place-items: center;
      border: 3px solid #9fe8ff;
      border-radius: 8px;
      background: #1f6bff;
      box-shadow:
        0 0 24px #2d7bff,
        0 0 60px rgb(45 123 255 / 0.7),
        inset 0 0 18px #7fd6ff;
      opacity: 0;
    }
    .cube span {
      width: 40%;
      height: 40%;
      border-radius: 3px;
      background: #7fd6ff;
      box-shadow: 0 0 16px #bdf1ff;
    }
    :host([data-step='cube']) .cube {
      animation: cube 0.85s cubic-bezier(0.3, 0.7, 0.4, 1) both;
    }
    @keyframes cube {
      0% {
        opacity: 0;
        transform: translateY(-160px) rotate(0) scale(0.7);
      }
      40% {
        opacity: 1;
        transform: translateY(0) rotate(240deg) scale(1);
      }
      52% {
        transform: translateY(-10px) rotate(300deg) scale(1.06, 0.94);
      }
      80% {
        opacity: 1;
        transform: rotate(720deg) scale(0.82);
      }
      100% {
        opacity: 0;
        transform: rotate(1080deg) scale(2.6);
      }
    }

    /* Cinta */
    .reel {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
    }
    :host(:not([data-step='cube'])) .reel {
      opacity: 1;
    }
    .item {
      position: absolute;
      left: 50%;
      top: 40%;
      width: min(58cqw, 280px);
      transform-origin: center;
      translate: -50% -50%;
      will-change: transform, opacity;
    }
    .item .col {
      position: absolute;
      inset: 0;
      clip-path: inset(-20% 102% -20% -2%);
    }
    .item.win .col {
      clip-path: inset(-20% -2% -20% -2%);
      transition: clip-path 0.4s ease-out;
    }
    .item.win .sil {
      opacity: 0;
      transition: opacity 0.4s 0.3s;
    }
    .frame {
      position: absolute;
      left: 50%;
      top: 40%;
      width: min(70cqw, 340px);
      height: min(42cqw, 200px);
      translate: -50% -50%;
      opacity: 0;
      transition: opacity 0.2s;
    }
    :host([data-step='spin']) .frame {
      opacity: 1;
    }
    .frame::before,
    .frame::after {
      content: '';
      position: absolute;
      left: 50%;
      margin-left: -11px;
      border: 11px solid transparent;
      filter: drop-shadow(0 0 7px var(--rd-signal));
    }
    .frame::before {
      top: -6px;
      border-top: 15px solid var(--rd-signal);
      transform-origin: 50% 0;
    }
    .frame::after {
      bottom: -6px;
      border-bottom: 15px solid var(--rd-signal);
      transform-origin: 50% 100%;
    }
    .frame.tick::before {
      animation: tick-top 0.12s ease-out;
    }
    .frame.tick::after {
      animation: tick-bottom 0.12s ease-out;
    }
    @keyframes tick-top {
      40% {
        transform: rotate(20deg);
      }
    }
    @keyframes tick-bottom {
      40% {
        transform: rotate(-20deg);
      }
    }

    /* Revelación */
    .rays {
      position: absolute;
      left: 50%;
      top: 40%;
      width: 200cqw;
      height: 200cqw;
      margin: -100cqw;
      background: repeating-conic-gradient(var(--rd-prize-paint) 0 9deg, transparent 9deg 24deg);
      -webkit-mask: radial-gradient(closest-side, #000 8%, transparent 72%);
      mask: radial-gradient(closest-side, #000 8%, transparent 72%);
      opacity: 0;
      transition: opacity 0.4s;
      animation: rays 16s linear infinite;
    }
    :host([data-step='reveal']) .rays {
      opacity: 0.32;
    }
    @keyframes rays {
      to {
        rotate: 360deg;
      }
    }
    .flash {
      position: absolute;
      inset: 0;
      background: #fff;
      opacity: 0;
      pointer-events: none;
    }
    .flash.go {
      animation: flash 0.42s ease-out;
    }
    @keyframes flash {
      0% {
        opacity: 0.95;
      }
      100% {
        opacity: 0;
      }
    }
    .title {
      position: absolute;
      left: 0;
      right: 0;
      top: 56%;
      display: grid;
      justify-items: center;
      gap: 6px;
      text-align: center;
    }
    .title em {
      font: var(--rd-dash-font);
      font-size: clamp(44px, 15cqw, 64px);
      white-space: nowrap;
      color: var(--rd-dash-color);
      text-shadow: var(--rd-dash-shadow);
      transform: var(--rd-dash-transform);
      animation: pop 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) 0.2s both;
    }
    .title strong {
      margin-top: 6px;
      padding-inline: 16px;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: clamp(26px, 8.6cqw, 36px);
      line-height: 1.1;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--rd-chalk);
      text-shadow: 0 0 14px var(--rd-prize-paint);
      animation: pop 0.5s cubic-bezier(0.2, 1.5, 0.4, 1) 0.28s both;
    }
    @keyframes pop {
      from {
        opacity: 0;
        scale: 0.65;
      }
    }
    .going,
    .skip {
      position: absolute;
      left: 15%;
      right: 15%;
      bottom: calc(8% + env(safe-area-inset-bottom, 0px));
      text-align: center;
      font-size: 13px;
      color: var(--rd-muted);
      opacity: 0;
    }
    :host([data-step='spin']) .skip,
    :host([data-step='reveal']) .going {
      opacity: 1;
    }
    .going {
      display: grid;
      gap: 7px;
    }
    .going i {
      display: block;
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      background: var(--rd-line);
    }
    .going i::after {
      content: '';
      display: block;
      height: 100%;
      background: var(--rd-neon-cyan);
      box-shadow: 0 0 8px var(--rd-neon-cyan);
      transform: scaleX(0);
      transform-origin: left;
    }
    :host([data-step='reveal']) .going i::after {
      transform: scaleX(1);
      transition: transform 2.2s linear;
    }
    @media (prefers-reduced-motion: reduce) {
      .rays {
        animation: none;
      }
    }
  `,
})
export class PrizeRoulette {
  readonly prize = input.required<Prize>();
  /** Cinta completa, con el premio en `PRIZE_REEL_WINNER`. */
  readonly reel = input.required<readonly Prize[]>();
  /** Pasa un premio por el centro (para el clic). */
  readonly tick = output<void>();
  readonly revealed = output<void>();
  readonly finished = output<void>();

  protected readonly winner = PRIZE_REEL_WINNER;
  protected readonly step = signal<Step>('cube');
  protected readonly accent = computed(() => prizeAccent(this.prize()));
  protected readonly name = computed(() => {
    const prize = this.prize();
    return `garage.${prize.kind === 'car' ? 'car' : 'fx'}.${prize.id}`;
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly reelEl = viewChild.required<ElementRef<HTMLElement>>('reelEl');
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly flashEl = viewChild.required<ElementRef<HTMLElement>>('flash');

  private alive = true;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private raf = 0;
  /** Salta lo que esté pasando ahora mismo. */
  private advance: () => void = () => undefined;

  constructor() {
    afterNextRender(() => void this.play());
    inject(DestroyRef).onDestroy(() => {
      this.alive = false;
      clearTimeout(this.timer);
      cancelAnimationFrame(this.raf);
    });
  }

  protected skip(): void {
    this.advance();
  }

  private async play(): Promise<void> {
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.place(0);
    if (!reduced) {
      await this.wait(CUBE_MS);
      if (!this.alive) return;
      this.flash();
      this.step.set('spin');
      await this.spin();
      if (!this.alive) return;
    }
    this.reveal();
    await this.wait(REVEAL_MS);
    if (this.alive) this.finished.emit();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timer = setTimeout(resolve, ms);
      this.advance = () => {
        clearTimeout(this.timer);
        resolve();
      };
    });
  }

  private spin(): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      let last = -1;
      this.advance = () => {
        cancelAnimationFrame(this.raf);
        resolve();
      };
      const frame = (now: number) => {
        const elapsed = now - start;
        const pos = reelPosition(elapsed);
        this.place(pos);
        const centered = Math.round(pos);
        if (centered !== last) {
          last = centered;
          this.tick.emit();
          this.kickPointers();
        }
        if (elapsed >= REEL_SPIN_MS + REEL_SETTLE_MS) resolve();
        else this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    });
  }

  private reveal(): void {
    this.flash();
    this.place(PRIZE_REEL_WINNER);
    this.items().forEach((el, i) => {
      if (i !== PRIZE_REEL_WINNER) el.style.opacity = '0';
      else {
        el.style.transition = 'transform 0.45s cubic-bezier(0.2, 1.6, 0.4, 1)';
        el.style.transform = 'scale(1.25)';
      }
    });
    this.step.set('reveal');
    this.revealed.emit();
  }

  /** Coloca la cinta: fuera de Angular porque cambia en cada fotograma. */
  private place(pos: number): void {
    const width = Math.min(this.host.nativeElement.clientWidth, MAX_WIDTH);
    this.items().forEach((el, i) => {
      const offset = i - pos;
      const away = Math.abs(offset);
      if (away > 3) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = String(1 - Math.min(away, 2.4) * 0.34);
      el.style.transform = `translateX(${offset * width * ITEM_SPACING}px) scale(${1.08 - Math.min(away, 2) * 0.3})`;
      el.style.setProperty('--rd-prize-edge', away < 0.5 ? 'var(--rd-neon-pink)' : 'var(--rd-neon-cyan)');
    });
  }

  private items(): HTMLElement[] {
    return Array.from(this.reelEl().nativeElement.children) as HTMLElement[];
  }

  private kickPointers(): void {
    const el = this.frame().nativeElement;
    el.classList.remove('tick');
    void el.offsetWidth;
    el.classList.add('tick');
  }

  private flash(): void {
    const el = this.flashEl().nativeElement;
    el.classList.remove('go');
    void el.offsetWidth;
    el.classList.add('go');
  }
}
