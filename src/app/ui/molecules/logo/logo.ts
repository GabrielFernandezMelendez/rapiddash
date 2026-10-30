import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Aesthetic, isSynthwave } from '../../../core/domain/settings/aesthetic';

/**
 * Logo del juego según la estética.
 * - Clásico: «Rapid» y «Dash» con la estela de velocidad.
 * - Synthwave: «RAPID» con relieve que rebota letra a letra, «Dash» en firma de neón que sube y
 *   baja entera, y el vehículo 3D (render fijo del mismo modelo del juego) saliendo por encima.
 */
@Component({
  selector: 'rd-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (synth()) {
      <div class="synth" role="img" aria-label="RapidDash">
        <img class="car" [src]="carSrc()" alt="" />
        <span class="rapid" aria-hidden="true">
          @for (c of letters; track $index) {
            <span class="l" [style.--i]="$index" [attr.data-ch]="c"
              ><span class="f">{{ c }}</span></span
            >
          }
        </span>
        <span class="dash" aria-hidden="true">Dash</span>
      </div>
    } @else {
      <h1 class="classic">
        <span class="rapid">Rapid</span>
        <span class="dash">Dash</span>
      </h1>
    }
  `,
  styleUrl: './logo.scss',
})
export class Logo {
  readonly aesthetic = input.required<Aesthetic>();
  protected readonly synth = computed(() => isSynthwave(this.aesthetic()));
  protected readonly carSrc = computed(
    () => `brand/logo-car-${this.aesthetic() === 'futurist' ? 'futurist' : 'retro'}.png`,
  );
  protected readonly letters = [...'RAPID'];
}
