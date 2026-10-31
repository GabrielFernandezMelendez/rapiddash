import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AudioPort } from './core/application/ports/out/audio.port';
import { SettingsRepository } from './core/application/ports/out/settings.repository';
import { AestheticService } from './shared/aesthetic/aesthetic.service';
import { AccountService } from './shared/account/account.service';

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
export class App {
  constructor() {
    const account = inject(AccountService);
    const router = inject(Router);
    // Si al confirmar la sesión el perfil desaparece (sesión cerrada en otro sitio), a la bienvenida
    let had = account.profile() !== null;
    effect(() => {
      const has = account.profile() !== null;
      if (had && !has && !router.url.startsWith('/welcome')) void router.navigate(['/welcome']);
      had = has;
    });

    // Música de los menús en todas las pantallas menos la carrera (que tiene la suya)
    const audio = inject(AudioPort);
    const aesthetic = inject(AestheticService);
    audio.setVolumes(inject(SettingsRepository).getVolumes());
    const inRace = signal(true);
    router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      inRace.set(e.urlAfterRedirects.startsWith('/race'));
    });
    effect(() => {
      if (!inRace()) audio.playMenu(aesthetic.aesthetic());
    });
  }
}
