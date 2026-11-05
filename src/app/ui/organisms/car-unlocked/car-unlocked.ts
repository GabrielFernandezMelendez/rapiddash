import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';

/**
 * Pantalla sencilla tras la carrera en la que se cogió el cubo azul: «Desbloqueaste» y el nombre
 * del coche ganado. Se cierra con el botón o con Escape y deja ver los resultados.
 */
@Component({
  selector: 'rd-car-unlocked',
  imports: [Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="screen" role="dialog" aria-modal="true" [attr.aria-label]="'cube.unlocked' | t">
      <div class="cube" aria-hidden="true"><span></span></div>
      <p class="title">{{ 'cube.unlocked' | t }}</p>
      <p class="name">{{ carName() }}</p>
      <p class="hint">{{ 'cube.hint' | t }}</p>
      <button rdButton type="button" #ok (click)="closed.emit()">{{ 'cube.ok' | t }}</button>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 30;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgb(8 2 22 / 0.82);
      backdrop-filter: blur(3px);
    }
    .screen {
      display: grid;
      justify-items: center;
      gap: 10px;
      text-align: center;
      animation: in 0.4s cubic-bezier(0.2, 1.4, 0.4, 1) both;
    }
    .cube {
      width: 74px;
      height: 74px;
      margin-bottom: 14px;
      display: grid;
      place-items: center;
      border: 3px solid #9fe8ff;
      border-radius: 8px;
      background: #1f6bff;
      box-shadow:
        0 0 24px #2d7bff,
        0 0 60px rgb(45 123 255 / 0.6),
        inset 0 0 18px #7fd6ff;
      transform: rotate(45deg);
      animation: spin 3s linear infinite;
    }
    .cube span {
      width: 30px;
      height: 30px;
      background: #7fd6ff;
      border-radius: 3px;
      box-shadow: 0 0 16px #bdf1ff;
    }
    .title {
      margin: 0;
      font: var(--rd-dash-font);
      font-size: clamp(44px, 14vw, 64px);
      white-space: nowrap;
      color: var(--rd-dash-color);
      text-shadow: var(--rd-dash-shadow);
      transform: var(--rd-dash-transform);
    }
    .name {
      margin: 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: clamp(26px, 8vw, 34px);
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--rd-chalk);
      text-shadow: 0 0 14px rgb(45 123 255 / 0.9);
    }
    .hint {
      margin: 0 0 12px;
      color: var(--rd-muted);
      font-size: 14px;
    }
    button {
      min-width: 180px;
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: scale(0.7);
      }
    }
    @keyframes spin {
      to {
        transform: rotate(405deg);
      }
    }
  `,
})
export class CarUnlocked {
  readonly carName = input.required<string>();
  readonly closed = output<void>();
  private readonly ok = viewChild.required<ElementRef<HTMLButtonElement>>('ok');

  constructor() {
    afterNextRender(() => this.ok().nativeElement.focus());
  }
}
