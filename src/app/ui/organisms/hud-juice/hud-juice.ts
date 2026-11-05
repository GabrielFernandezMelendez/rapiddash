import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CAR_TUNING } from '../../../core/domain/car/car-tuning';
import { RaceViewState } from '../../../core/application/use-cases/race-session';
import { Medal, MedalTargets, medalFor, nextMedal } from '../../../core/domain/medals/medals';
import { formatDelta, formatTime, NO_TIME } from '../../../shared/format-time';
import { Button } from '../../atoms/button/button';

/** MOCKUP del HUD «con juice»: mismos datos que el HUD actual, pero con vida. */
const KMH_FACTOR = 9;
const SEGMENTS = 24;

export const MEDAL_NAMES: Readonly<Record<Medal, string>> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  platinum: 'Platino',
};

/** Muelle crítico sencillo, por fotograma (el HUD se pinta una vez por tick). */
class Spring {
  value = 0;
  private velocity = 0;
  constructor(
    private readonly stiffness: number,
    private readonly damping: number,
  ) {}
  step(target: number): number {
    this.velocity += (target - this.value) * this.stiffness;
    this.velocity *= this.damping;
    this.value += this.velocity;
    return this.value;
  }
}

@Component({
  selector: 'rd-hud-juice',
  imports: [Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hud-juice.html',
  styleUrl: './hud-juice.scss',
})
export class HudJuice {
  readonly state = input.required<RaceViewState>();
  readonly mapName = input('');
  readonly rivalName = input<string | null>(null);
  /** Tiempos objetivo del mapa (null = mapa sin medallas). */
  readonly targets = input<MedalTargets | null>(null);
  /** Mi mejor tiempo antes de esta carrera (decide la medalla actual). */
  readonly bestTime = input<number | null>(null);
  /** MOCKUP: fantasma de mentira (va y viene) y objetivo corto para enseñar todo en pocos segundos. */
  readonly demo = input(false);
  readonly exit = output<void>();

  private readonly speedSpring = new Spring(0.16, 0.62);
  private readonly tiltSpring = new Spring(0.12, 0.7);
  private lastLateral = 0;
  private lastSign = 0;
  protected readonly kmhShown = signal(0);
  protected readonly tilt = signal(0);
  /** Cada cambio de signo del fantasma rehace la píldora (vuelve a «estallar»). */
  protected readonly ghostPop = signal(0);
  protected readonly aheadFlashAt = signal(-Infinity);

  constructor() {
    effect(() => {
      const s = this.state();
      untracked(() => {
        // Velocidad con inercia: sube con un pequeño rebote y baja suave
        this.kmhShown.set(Math.max(0, this.speedSpring.step(s.speed * KMH_FACTOR)));
        // Inclinación del HUD en los cambios de carril (sigue al coche, como la cámara)
        const dLat = s.lateral - this.lastLateral;
        this.lastLateral = s.lateral;
        const target = Math.abs(dLat) > 1 ? 0 : Math.max(-2.5, Math.min(2.5, -dLat * 22));
        this.tilt.set(this.tiltSpring.step(target));
        // Píldora del fantasma: estalla al cambiar de signo; al pasar delante, destello
        const d = this.delta(s);
        const sign = d === null ? 0 : d <= 0 ? -1 : 1;
        if (sign !== this.lastSign && sign !== 0) {
          this.ghostPop.update((n) => n + 1);
          if (sign < 0 && this.lastSign > 0) this.aheadFlashAt.set(s.time);
        }
        if (sign !== 0) this.lastSign = sign;
      });
    });
  }

  protected readonly time = computed(() => formatTime(this.state().time));
  protected readonly best = computed(() => {
    const b = this.state().bestTime;
    return b === null ? NO_TIME : formatTime(b);
  });
  private delta(s: RaceViewState): number | null {
    if (!this.demo() || s.phase !== 'racing') return s.ghostDelta;
    return 0.45 * Math.sin(s.time * 1.1) + 0.05;
  }
  protected readonly ghost = computed(() => {
    const d = this.delta(this.state());
    return d === null ? null : { label: formatDelta(d), ahead: d <= 0 };
  });
  protected readonly aheadFlash = computed(() => this.state().time - this.aheadFlashAt() < 1.1);
  protected readonly kmh = computed(() => String(Math.round(this.kmhShown())).padStart(3, '0'));
  protected readonly speedRatio = computed(
    () => this.kmhShown() / (CAR_TUNING.maxSpeed * KMH_FACTOR),
  );
  protected readonly litSegments = computed(() =>
    Math.round(Math.min(1, this.speedRatio()) * SEGMENTS),
  );
  protected readonly segments = Array.from({ length: SEGMENTS }, (_, i) => i);
  protected readonly topSpeed = computed(() => this.speedRatio() > 0.96);

  // ---------- Medallas ----------
  protected readonly current = computed(() => {
    const t = this.targets();
    return t ? medalFor(this.bestTime(), t) : null;
  });
  protected readonly next = computed(() => (this.targets() ? nextMedal(this.current()) : null));
  protected readonly nextTarget = computed(() => {
    const t = this.targets();
    const n = this.next();
    if (this.demo() && n) return 9;
    return t && n ? t[n] : null;
  });
  /** Cuánto del tiempo objetivo se ha gastado ya (0-1). */
  protected readonly progress = computed(() => {
    const target = this.nextTarget();
    return target ? Math.min(1, this.state().time / target) : 1;
  });
  protected readonly missed = computed(() => {
    const target = this.nextTarget();
    return target !== null && this.state().time > target;
  });
  protected readonly margin = computed(() => {
    const target = this.nextTarget();
    if (target === null) return '';
    const left = target - this.state().time;
    return left >= 0 ? formatTime(left) : '—';
  });
  protected readonly targetText = computed(() => {
    const target = this.nextTarget();
    return target === null ? '' : formatTime(target);
  });
  protected readonly names = MEDAL_NAMES;
}
