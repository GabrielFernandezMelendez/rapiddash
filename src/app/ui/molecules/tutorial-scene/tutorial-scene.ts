import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TutorialStep } from '../../../core/domain/settings/tutorial';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';

/**
 * Animación en bucle de cada paso del tutorial, vista desde arriba. Siempre con la estética
 * futurista (pista violeta, muros de neón y la nave), sea cual sea la elegida: es solo un
 * esquema, ligero (CSS) y que se entiende de un vistazo.
 */
@Component({
  selector: 'rd-tutorial-scene',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tutorial-scene.html',
  styleUrl: './tutorial-scene.scss',
  host: { 'aria-hidden': 'true' },
})
export class TutorialScene {
  readonly step = input.required<TutorialStep>();
}
