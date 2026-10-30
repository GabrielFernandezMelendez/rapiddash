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
    /* En el móvil el juego ocupa toda la pantalla, también bajo la barra de estado y la del
       navegador (viewport-fit=cover); los márgenes seguros los ponen las plantillas. */
    .frame {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: var(--rd-asphalt);
      /* Los textos que escalan con el ancho (logo) usan cqw: el ancho del juego, no de la ventana */
      container-type: inline-size;
    }
    @media (min-width: 700px) {
      /* En el PC, un móvil de 9:19 centrado */
      .frame {
        position: relative;
        inset: auto;
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
