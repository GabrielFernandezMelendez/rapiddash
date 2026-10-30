import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import {
  nextStep,
  previousStep,
  TUTORIAL_STEPS,
  TutorialStep,
} from '../../../core/domain/settings/tutorial';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Modal } from '../../molecules/modal/modal';
import { TutorialScene } from '../../molecules/tutorial-scene/tutorial-scene';

/** Puntos de texto de cada paso (claves i18n). En el del rival, los tres botones. */
const POINTS: Record<TutorialStep, readonly string[]> = {
  accelerate: ['tutorial.accelerate.hold', 'tutorial.accelerate.release'],
  lanes: ['tutorial.lanes.swipe', 'tutorial.lanes.chain', 'tutorial.lanes.wall'],
  junctions: ['tutorial.junctions.only', 'tutorial.junctions.timing'],
  funnels: ['tutorial.funnels.what', 'tutorial.funnels.move'],
  rival: ['tutorial.rival.ghost', 'tutorial.rival.top', 'tutorial.rival.above', 'tutorial.rival.mine'],
};

/** «Cómo se juega»: cinco pasos con una animación cada uno. Saltar o terminar lo cierra. */
@Component({
  selector: 'rd-tutorial',
  imports: [Modal, Button, TutorialScene, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="'tutorial.title' | t" (dismiss)="closed.emit()">
      <div modal-title class="head">
        <span class="counter">
          {{ 'tutorial.title' | t }} · {{ index() + 1 }}/{{ total }}
          <button type="button" class="skip" (click)="closed.emit()">{{ 'tutorial.skip' | t }}</button>
        </span>
        {{ 'tutorial.' + step() + '.title' | t }}
      </div>
      <rd-tutorial-scene [step]="step()" />
      <ul>
        @for (key of points(); track key) {
          <li>{{ key | t }}</li>
        }
      </ul>
      <div class="dots" aria-hidden="true">
        @for (s of steps; track s) {
          <i [class.on]="s === step()"></i>
        }
      </div>
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" [disabled]="!previous()" (click)="back()">
          {{ 'tutorial.back' | t }}
        </button>
        <button rdButton type="button" class="go" (click)="forward()">
          {{ (next() ? 'tutorial.next' : 'tutorial.go') | t }}
        </button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .head {
      display: grid;
      gap: 4px;
    }
    .counter {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      letter-spacing: 0.14em;
      color: var(--rd-signal);
    }
    .skip {
      min-height: 40px;
      padding: 0 4px;
      border: 0;
      background: none;
      color: var(--rd-muted);
      font-family: var(--rd-font-body);
      font-style: normal;
      font-weight: 500;
      font-size: 14px;
      letter-spacing: 0;
      text-transform: none;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;
    }
    ul {
      display: grid;
      gap: 6px;
      margin: 0;
      padding-left: 18px;
      line-height: 1.4;
    }
    .go {
      white-space: nowrap;
      padding: 0 10px;
    }
    .dots {
      display: flex;
      justify-content: center;
      gap: 6px;
    }
    .dots i {
      width: 6px;
      height: 6px;
      border-radius: 3px;
      background: var(--rd-line);
      transition: width 0.2s;
    }
    .dots i.on {
      width: 18px;
      background: var(--rd-signal);
    }
  `,
})
export class Tutorial {
  /** Se cierra al saltar o al terminar (en los dos casos cuenta como visto). */
  readonly closed = output<void>();

  protected readonly steps = TUTORIAL_STEPS;
  protected readonly total = TUTORIAL_STEPS.length;
  protected readonly step = signal<TutorialStep>(TUTORIAL_STEPS[0]);
  protected readonly index = computed(() => TUTORIAL_STEPS.indexOf(this.step()));
  protected readonly next = computed(() => nextStep(this.step()));
  protected readonly previous = computed(() => previousStep(this.step()));
  protected readonly points = computed(() => POINTS[this.step()]);

  protected back(): void {
    const prev = this.previous();
    if (prev) this.step.set(prev);
  }

  protected forward(): void {
    const next = this.next();
    if (next) this.step.set(next);
    else this.closed.emit();
  }
}
