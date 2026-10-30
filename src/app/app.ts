import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Marco de la app: en móvil ocupa toda la pantalla; en el ordenador simula un móvil vertical
 * centrado para poder probar con teclado sin desplegar.
 */
@Component({
  selector: 'rd-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="frame"><router-outlet /></main>`,
  styles: `
    :host {
      display: grid;
      place-items: center;
      height: 100dvh;
    }
    .frame {
      position: relative;
      width: min(100vw, calc(100dvh * 9 / 19));
      height: 100dvh;
      overflow: hidden;
      background: var(--rd-asphalt);
    }
    @media (min-width: 700px) {
      .frame {
        height: min(100dvh, 900px);
        width: calc(min(100dvh, 900px) * 9 / 19);
        border-radius: 28px;
        box-shadow:
          0 0 0 1px var(--rd-line),
          0 30px 80px rgb(0 0 0 / 0.5);
      }
    }
  `,
})
export class App {}
