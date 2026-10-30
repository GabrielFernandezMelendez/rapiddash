/** Pose mínima para dibujar un coche sobre la pista. */
export interface CarPose {
  readonly leg: number;
  readonly distance: number;
  readonly lateral: number;
  readonly yaw: number;
}

export interface GhostFrame extends CarPose {
  readonly time: number;
  /** Progreso global de la pista: nunca decrece. */
  readonly progress: number;
}

/** Mejor vuelta guardada de un mapa: tiempo y recorrido para reproducir el fantasma. */
export interface BestRun {
  readonly mapId: string;
  readonly time: number;
  readonly frames: readonly GhostFrame[];
  readonly recordedAt: string;
  /** Versión de la física con la que se hizo (ver physics-version.ts). */
  readonly physicsVersion: number;
}

export const GHOST_SAMPLE_INTERVAL = 1 / 20;

const frameOf = (time: number, progress: number, p: CarPose): GhostFrame => ({
  time,
  progress,
  leg: p.leg,
  distance: p.distance,
  lateral: p.lateral,
  yaw: p.yaw,
});

export class GhostRecorder {
  private readonly frames: GhostFrame[] = [];
  private lastTime = -Infinity;
  private lastLeg = 0;

  record(time: number, progress: number, pose: CarPose): void {
    // Al cambiar de tramo se graba siempre, para que la reproducción no mezcle tramos
    if (time - this.lastTime < GHOST_SAMPLE_INTERVAL && pose.leg === this.lastLeg) return;
    this.lastTime = time;
    this.lastLeg = pose.leg;
    this.frames.push(frameOf(time, progress, pose));
  }

  finish(time: number, progress: number, pose: CarPose): GhostFrame[] {
    this.frames.push(frameOf(time, progress, pose));
    return [...this.frames];
  }
}

export class GhostPlayback {
  constructor(private readonly frames: readonly GhostFrame[]) {}

  poseAt(time: number): CarPose | null {
    const f = this.frames;
    if (f.length === 0) return null;
    if (time <= f[0].time) return f[0];
    if (time >= f[f.length - 1].time) return f[f.length - 1];
    const i = this.indexBefore((frame) => frame.time, time);
    const a = f[i];
    const b = f[i + 1];
    // Entre tramos distintos no se interpola: las coordenadas no son comparables
    if (a.leg !== b.leg) return a;
    const t = (time - a.time) / (b.time - a.time || 1);
    return {
      leg: a.leg,
      distance: a.distance + (b.distance - a.distance) * t,
      lateral: a.lateral + (b.lateral - a.lateral) * t,
      yaw: a.yaw + (b.yaw - a.yaw) * t,
    };
  }

  /** Instante en que el fantasma alcanzó un progreso de la pista. */
  timeAtProgress(progress: number): number | null {
    const f = this.frames;
    if (f.length === 0 || progress > f[f.length - 1].progress) return null;
    if (progress <= f[0].progress) return f[0].time;
    const i = this.indexBefore((frame) => frame.progress, progress);
    const a = f[i];
    const b = f[i + 1];
    const t = (progress - a.progress) / (b.progress - a.progress || 1);
    return a.time + (b.time - a.time) * t;
  }

  // Búsqueda binaria del último frame cuyo valor es <= target
  private indexBefore(value: (f: GhostFrame) => number, target: number): number {
    let lo = 0;
    let hi = this.frames.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (value(this.frames[mid]) <= target) lo = mid;
      else hi = mid;
    }
    return lo;
  }
}
