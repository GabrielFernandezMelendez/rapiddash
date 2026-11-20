import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CAR_TUNING, CarTuning, CurveModel } from '../../../core/domain/car/car-tuning';
import { LAB_GROUPS, LAB_PARAMS, labDiff, LabParam } from '../../../core/domain/car/physics-lab';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';

/**
 * Laboratorio de física (solo en debug): sliders agrupados que cambian la conducción al momento,
 * el modelo de las curvas (agarre o imán), «Restablecer» y «Copiar valores» (solo lo cambiado).
 * Va encima de la carrera, que sigue en marcha.
 */
@Component({
  selector: 'rd-physics-lab',
  imports: [Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" role="dialog" [attr.aria-label]="'lab.title' | t" (pointerdown)="$event.stopPropagation()">
      <header>
        <h2>{{ 'lab.title' | t }}</h2>
        <button rdButton variant="ghost" type="button" (click)="closed.emit()" [attr.aria-label]="'lab.close' | t">✕</button>
      </header>
      <div class="model">
        <span>{{ 'lab.curveModel' | t }}</span>
        @for (m of models; track m) {
          <button type="button" [class.on]="values().curveModel === m" (click)="set('curveModel', m)">
            {{ 'lab.model.' + m | t }}
          </button>
        }
      </div>
      <div class="groups">
        @for (g of groups; track g) {
          <h3>{{ 'lab.group.' + g | t }}</h3>
          @for (p of paramsOf(g); track p.key) {
            <label [class.changed]="values()[p.key] !== defaults[p.key]">
              <span class="name">{{ 'lab.param.' + p.key | t }}</span>
              <input
                type="range"
                [min]="p.min"
                [max]="p.max"
                [step]="p.step"
                [value]="values()[p.key]"
                (input)="set(p.key, +$any($event.target).value)"
              />
              <b>{{ values()[p.key] }}</b>
            </label>
          }
        }
      </div>
      <footer>
        <button rdButton variant="secondary" type="button" (click)="reset.emit()">{{ 'lab.reset' | t }}</button>
        <button rdButton type="button" (click)="copy()">{{ (copied() ? 'lab.copied' : 'lab.copy') | t }}</button>
      </footer>
      <p class="note">{{ 'lab.note' | t }}</p>
    </section>
  `,
  styles: `
    :host {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 40;
      display: grid;
      max-height: 72vh;
      pointer-events: auto;
    }
    .panel {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto auto;
      gap: 8px;
      max-height: 72vh;
      padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px));
      border-radius: 14px 14px 0 0;
      background: rgb(13 4 32 / 0.92);
      box-shadow: 0 -1px 0 var(--rd-line), 0 -10px 30px rgb(0 0 0 / 0.5);
      backdrop-filter: blur(6px);
      color: var(--rd-chalk);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    h2 {
      margin: 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-size: 20px;
      text-transform: uppercase;
    }
    .model {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--rd-muted);
      button {
        padding: 5px 10px;
        border: 0;
        border-radius: 999px;
        background: rgb(255 255 255 / 0.06);
        color: var(--rd-chalk);
        font-weight: 600;
      }
      button.on {
        background: var(--rd-neon-cyan);
        color: #0d0420;
      }
    }
    .groups {
      display: grid;
      gap: 4px;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 4px;
    }
    h3 {
      margin: 8px 0 2px;
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--rd-signal);
    }
    label {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 44px;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    label.changed .name,
    label.changed b {
      color: var(--rd-neon-cyan);
    }
    input {
      width: 100%;
      accent-color: var(--rd-neon-pink);
    }
    b {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    footer button {
      min-width: 0;
      white-space: nowrap;
      font-size: 15px;
    }
    .note {
      margin: 0;
      font-size: 11px;
      color: var(--rd-muted);
    }
  `,
})
export class PhysicsLab {
  readonly values = input.required<CarTuning>();
  readonly changed = output<Partial<CarTuning>>();
  readonly reset = output<void>();
  readonly closed = output<void>();
  protected readonly groups = LAB_GROUPS;
  protected readonly defaults = CAR_TUNING;
  protected readonly models: readonly CurveModel[] = ['grip', 'magnet'];
  protected readonly copied = signal(false);
  private readonly byGroup = computed(() => LAB_PARAMS);

  protected paramsOf(group: string): readonly LabParam[] {
    return this.byGroup().filter((p) => p.group === group);
  }

  protected set(key: keyof CarTuning, value: number | CurveModel): void {
    this.changed.emit({ [key]: value } as Partial<CarTuning>);
  }

  /** Copia solo lo que cambia respecto a los de serie, para pasárselo a Claude. */
  protected copy(): void {
    const text = JSON.stringify(labDiff(this.values()), null, 2);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }
}
