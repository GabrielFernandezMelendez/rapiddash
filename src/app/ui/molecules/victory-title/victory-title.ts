import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Título de la pantalla de victoria, con la letra del logo: las letras saltan una a una. */
@Component({
  selector: 'rd-victory-title',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 [attr.aria-label]="text()">
      @for (letter of letters(); track $index) {
        <span aria-hidden="true" [style.--i]="$index">{{ letter }}</span>
      }
    </h1>
  `,
  styles: `
    :host {
      display: block;
    }
    h1 {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      margin: 0;
      font: var(--rd-dash-font);
      font-size: clamp(56px, 19vw, 88px);
      color: var(--rd-dash-color);
      transform: var(--rd-dash-transform);
    }
    span {
      display: inline-block;
      white-space: pre;
      text-shadow: var(--rd-dash-shadow);
      animation: letter 2.4s cubic-bezier(0.3, 1.4, 0.5, 1) infinite;
      animation-delay: calc(var(--i) * 70ms);
    }
    @keyframes letter {
      0%,
      42%,
      100% {
        transform: none;
        color: var(--rd-dash-color);
      }
      14% {
        transform: translateY(-22%) scale(1.14);
        color: var(--rd-chalk);
      }
      28% {
        transform: translateY(3%) scale(0.98);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      span {
        animation: none;
      }
    }
  `,
})
export class VictoryTitle {
  readonly text = input.required<string>();
  protected readonly letters = computed(() => [...this.text()]);
}
