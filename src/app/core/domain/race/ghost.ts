/** Pose mínima para dibujar un coche sobre la pista. */
export interface CarPose {
  readonly distance: number;
  readonly lateral: number;
  readonly yaw: number;
}

export interface GhostFrame extends CarPose {
  readonly time: number;
}

/** Mejor vuelta guardada de un mapa: tiempo y recorrido para reproducir el fantasma. */
export interface BestRun {
  readonly mapId: string;
  readonly time: number;
  readonly frames: readonly GhostFrame[];
  readonly recordedAt: string;
}

export const GHOST_SAMPLE_INTERVAL = 1 / 20;

export class GhostRecorder {
  private readonly frames: GhostFrame[] = [];
  private lastTime = -Infinity;

  record(time: number, pose: CarPose): void {
    if (time - this.lastTime < GHOST_SAMPLE_INTERVAL) return;
    this.lastTime = time;
    this.frames.push({ time, distance: pose.distance, lateral: pose.lateral, yaw: pose.yaw });
  }

  finish(time: number, pose: CarPose): GhostFrame[] {
    this.frames.push({ time, ...pose });
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
    const t = (time - a.time) / (b.time - a.time || 1);
    return {
      distance: a.distance + (b.distance - a.distance) * t,
      lateral: a.lateral + (b.lateral - a.lateral) * t,
      yaw: a.yaw + (b.yaw - a.yaw) * t,
    };
  }

  /** Instante en que el fantasma pasó por una distancia (la distancia nunca decrece). */
  timeAtDistance(distance: number): number | null {
    const f = this.frames;
    if (f.length === 0 || distance > f[f.length - 1].distance) return null;
    if (distance <= f[0].distance) return f[0].time;
    const i = this.indexBefore((frame) => frame.distance, distance);
    const a = f[i];
    const b = f[i + 1];
    const t = (distance - a.distance) / (b.distance - a.distance || 1);
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
