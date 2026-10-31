import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';

/** Dónde está el botón de Ajustes en la pantalla (para apuntarle con la flecha). */
export interface HintAnchor {
  readonly bottom: number;
  /** Distancia del centro del botón al borde derecho de la pantalla. */
  readonly centerFromRight: number;
}

/**
 * Aviso de la primera vez: oscurece la portada, una flecha señala Ajustes y un bocadillo cuenta
 * que ahí se cambia la estética (clásico, retro o futurista). Se cierra con «Entendido», tocando
 * fuera o con Escape; la portada ilumina el botón de Ajustes mientras está abierto.
 */
@Component({
  selector: 'rd-aesthetic-hint',
  imports: [Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="dim" (click)="closed.emit()"></div>
    <svg
      class="arrow"
      viewBox="0 0 40 40"
      aria-hidden="true"
      [style.top.px]="anchor().bottom + 4"
      [style.right.px]="anchor().centerFromRight - 20"
    >
      <path d="M20 4 L32 18 H24 V36 H16 V18 H8 Z" />
    </svg>
    <section
      class="tip"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hint-title"
      [style.top.px]="anchor().bottom + 54"
    >
      <span class="nub" aria-hidden="true" [style.right.px]="anchor().centerFromRight - 24"></span>
      <h3 id="hint-title">{{ 'hint.title' | t }}</h3>
      <p>{{ 'hint.text' | t }}</p>
      <div class="swatches" aria-hidden="true">
        <span><i class="classic"></i>{{ 'aesthetic.classic' | t }}</span>
        <span><i class="retro"></i>{{ 'aesthetic.retro' | t }}</span>
        <span><i class="futurist"></i>{{ 'aesthetic.futurist' | t }}</span>
      </div>
      <button rdButton type="button" class="ok" (click)="closed.emit()">{{ 'hint.ok' | t }}</button>
    </section>
  `,
  styles: `
    .dim {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgb(5 7 9 / 0.55);
    }
    .arrow {
      position: fixed;
      z-index: 43;
      width: 40px;
      height: 40px;
      fill: var(--rd-signal);
      animation: bob 1.1s ease-in-out infinite;
    }
    .tip {
      position: fixed;
      z-index: 42;
      right: 16px;
      width: min(270px, calc(100vw - 32px));
      display: grid;
      gap: 10px;
      padding: 16px 16px 14px;
      border-radius: 14px;
      background: var(--rd-asphalt-2);
      box-shadow:
        inset 0 0 0 1px var(--rd-line),
        0 12px 30px rgb(0 0 0 / 0.45);
      color: var(--rd-chalk);
    }
    .nub {
      position: absolute;
      top: -8px;
      width: 16px;
      height: 16px;
      background: var(--rd-asphalt-2);
      transform: rotate(45deg);
      box-shadow: -1px -1px 0 var(--rd-line);
    }
    h3 {
      margin: 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: 20px;
      text-transform: uppercase;
    }
    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.4;
      color: var(--rd-muted);
    }
    .swatches {
      display: flex;
      gap: 8px;
    }
    .swatches span {
      flex: 1;
      display: grid;
      justify-items: center;
      gap: 4px;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--rd-muted);
    }
    .swatches i {
      width: 100%;
      height: 30px;
      border-radius: 8px;
      box-shadow: inset 0 0 0 1px var(--rd-line);
    }
    /* Muestras fijas: enseñan las tres estéticas sea cual sea la elegida */
    .classic {
      background: linear-gradient(#bfe1dc 0 45%, #86b46b 45%);
    }
    .retro {
      background: linear-gradient(#2a0b4f, #ff2a6d);
    }
    .futurist {
      background: linear-gradient(#14072e 0 50%, #2de2e6 50%);
    }
    .ok {
      justify-self: end;
    }
    @keyframes bob {
      50% {
        transform: translateY(-6px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .arrow {
        animation: none;
      }
    }
  `,
})
export class AestheticHint {
  readonly anchor = input.required<HintAnchor>();
  readonly closed = output<void>();

  constructor() {
    // El foco va a «Entendido» para que el lector de pantalla y el teclado lo encuentren
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    afterNextRender(() => host.nativeElement.querySelector<HTMLElement>('.ok')?.focus());
  }
}
