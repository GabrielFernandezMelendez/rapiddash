import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Logo del juego: «RAPID» con relieve que rebota letra a letra, «Dash» en firma de neón que sube
 * y baja entera, y el deportivo 3D (render fijo del mismo modelo del juego) saliendo por encima.
 */
@Component({
  selector: 'rd-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="synth" role="img" aria-label="RapidDash">
      <img class="car" src="brand/logo-car-retro.png" alt="" />
      <span class="rapid" aria-hidden="true">
        @for (c of letters; track $index) {
          <span class="l" [style.--i]="$index" [attr.data-ch]="c"
            ><span class="f">{{ c }}</span></span
          >
        }
      </span>
      <span class="dash" aria-hidden="true">Dash</span>
    </div>
  `,
  styleUrl: './logo.scss',
})
export class Logo {
  protected readonly letters = [...'RAPID'];
}
