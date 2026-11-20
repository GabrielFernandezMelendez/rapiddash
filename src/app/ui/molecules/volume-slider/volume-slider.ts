import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toPercent } from '../../../core/domain/settings/volume';

/** Un segmento por cada 5 %. */
const SEGMENTS = 20;
const INDEXES = Array.from({ length: SEGMENTS }, (_, k) => k);

/**
 * Slider de volumen (0-100 %), como la barra de velocidad del HUD: 20 segmentos inclinados que
 * se encienden del amarillo al color del canal (música amarillo, efectos rosa) y una punta que
 * late. Al arrastrar, late más rápido, los segmentos hacen la ola y saltan chispas cuadradas; al
 * soltar, el número da un golpe. `changed` mientras se mueve; `released` al soltarlo.
 */
@Component({
  selector: 'rd-volume-slider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.effects]': "icon() === 'effects'", '[class.dragging]': 'dragging()' },
  template: `
    <div class="head">
      <label [attr.for]="inputId()">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          @if (icon() === 'music') {
            <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
          } @else {
            <path d="M11 5 6 9H2v6h4l5 4z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path>
          }
        </svg>
        {{ label() }}
      </label>
      <span class="value" [class.bump]="bump()">{{ percent() }} %</span>
    </div>
    <div class="track" #track>
      <div class="segs" aria-hidden="true">
        @for (k of indexes; track k) {
          <b [class.on]="k < lit()" [style.--k]="k"></b>
        }
      </div>
      <span class="orb" aria-hidden="true" [style.left.%]="4 + percent() * 0.92" [class.off]="percent() === 0"></span>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        [id]="inputId()"
        [value]="percent()"
        (input)="onInput($event)"
        (change)="onRelease($event)"
      />
    </div>
  `,
  styles: `
    :host {
      --c: var(--rd-signal);
      display: grid;
      gap: 8px;
    }
    :host(.effects) {
      --c: var(--rd-neon-pink);
    }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    svg {
      fill: none;
      stroke: var(--rd-neon-cyan);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .value {
      font-family: var(--rd-font-hud-time);
      font-size: 20px;
      color: var(--rd-signal);
      text-shadow: 0 0 10px color-mix(in srgb, var(--rd-signal) 60%, transparent);
      font-variant-numeric: tabular-nums;
      transition: transform 0.25s cubic-bezier(0.2, 1.6, 0.4, 1);
    }
    .value.bump {
      transform: scale(1.25);
    }
    .track {
      position: relative;
      height: 26px;
    }
    .segs {
      position: absolute;
      inset: 0 4%;
      display: grid;
      grid-template-columns: repeat(20, 1fr);
      gap: 3px;
      transform: skewX(-18deg);
    }
    b {
      /* Del amarillo al color del canal a lo largo de la barra */
      --seg: color-mix(in srgb, var(--rd-signal) calc(100% - var(--k) * 4%), var(--c));
      border-radius: 2px;
      background: color-mix(in srgb, var(--rd-violet) 70%, black);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rd-magenta) 30%, transparent);
      transition:
        background 0.15s,
        box-shadow 0.15s;
    }
    b.on {
      background: var(--seg);
      box-shadow:
        0 0 8px color-mix(in srgb, var(--seg) 70%, transparent),
        inset 0 2px 0 rgb(255 255 255 / 0.35);
    }
    :host(.dragging) b.on {
      animation: wave 0.9s ease-in-out infinite;
      animation-delay: calc(var(--k) * -45ms);
    }
    @keyframes wave {
      50% {
        transform: scaleY(1.25);
        filter: brightness(1.35);
      }
    }
    .orb {
      position: absolute;
      top: 50%;
      width: 22px;
      height: 22px;
      margin: -11px 0 0 -11px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle at 40% 35%, #fff, var(--c) 45%, color-mix(in srgb, var(--c) 40%, transparent) 70%);
      box-shadow:
        0 0 14px var(--c),
        0 0 28px color-mix(in srgb, var(--c) 60%, transparent);
      animation: beat 1.4s ease-in-out infinite;
    }
    .orb.off {
      opacity: 0.4;
    }
    :host(.dragging) .orb {
      animation-duration: 0.45s;
    }
    @keyframes beat {
      50% {
        transform: scale(1.25);
      }
    }
    .track ::ng-deep .spark {
      position: absolute;
      top: 50%;
      width: 5px;
      height: 5px;
      margin: -2.5px;
      background: var(--c);
      pointer-events: none;
      animation: spark 0.6s ease-out forwards;
    }
    @keyframes spark {
      to {
        transform: translate(var(--sx), var(--sy)) rotate(90deg);
        opacity: 0;
      }
    }
    input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    .track:has(input:focus-visible) .orb {
      outline: 2px solid var(--rd-signal);
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: reduce) {
      .orb,
      :host(.dragging) b.on {
        animation: none;
      }
      .track ::ng-deep .spark {
        display: none;
      }
    }
  `,
})
export class VolumeSlider {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  /** Música (amarillo) o efectos (rosa). */
  readonly icon = input<'music' | 'effects'>('music');
  /** De 0 a 1. */
  readonly value = input.required<number>();
  readonly changed = output<number>();
  readonly released = output<number>();

  protected readonly indexes = INDEXES;
  protected readonly percent = computed(() => toPercent(this.value()));
  protected readonly lit = computed(() => Math.round(this.percent() / 5));
  protected readonly dragging = signal(false);
  protected readonly bump = signal(false);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  protected onInput(event: Event): void {
    this.dragging.set(true);
    const value = this.read(event);
    this.changed.emit(value);
    this.sparks(4 + value * 100 * 0.92);
  }

  protected onRelease(event: Event): void {
    this.dragging.set(false);
    this.released.emit(this.read(event));
    this.bump.set(true);
    setTimeout(() => this.bump.set(false), 260);
  }

  protected read(event: Event): number {
    return Number((event.target as HTMLInputElement).value) / 100;
  }

  /** Chispas cuadradas que saltan de la punta (decoración). */
  private sparks(leftPercent: number): void {
    const track = this.track().nativeElement;
    for (let i = 0; i < 4; i++) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      const angle = (Math.random() - 0.5) * 2.4 - Math.PI / 2;
      const distance = 14 + Math.random() * 18;
      spark.style.left = `${leftPercent}%`;
      spark.style.setProperty('--sx', `${Math.cos(angle) * distance * (Math.random() < 0.5 ? -1 : 1)}px`);
      spark.style.setProperty('--sy', `${Math.sin(angle) * distance}px`);
      track.append(spark);
      setTimeout(() => spark.remove(), 650);
    }
  }
}
