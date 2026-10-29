import { CORNER_RADIUS, FINISH_RUNOFF, SAMPLE_STEP, START_DISTANCE } from './track-constants';
import { SegmentKind, TrackSegment, TurnDirection } from './track-segment';

/**
 * Convención de ejes: el plano del suelo es XZ.
 * Con rumbo h, el vector "adelante" es (sin h, -cos h) y el vector "derecha" es (cos h, sin h).
 * Una curvatura positiva gira a la derecha.
 */
export interface TrackSample {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
  readonly curvature: number;
  readonly kind: SegmentKind;
}

export interface CornerZone {
  readonly index: number;
  readonly start: number;
  readonly end: number;
  readonly direction: TurnDirection;
}

export interface TrackPoint {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
}

export class Track {
  private constructor(
    readonly samples: readonly TrackSample[],
    readonly corners: readonly CornerZone[],
    readonly length: number,
  ) {}

  readonly startDistance = START_DISTANCE;

  get finishDistance(): number {
    return this.length - FINISH_RUNOFF;
  }

  static fromSegments(segments: readonly TrackSegment[]): Track {
    const samples: TrackSample[] = [];
    const corners: CornerZone[] = [];
    let x = 0;
    let z = 0;
    let heading = 0;

    samples.push({ x, z, heading, curvature: 0, kind: 'straight' });

    for (const segment of segments) {
      const { length, angle } = Track.measure(segment);
      const steps = Math.max(1, Math.round(length / SAMPLE_STEP));
      const curvature = angle / (steps * SAMPLE_STEP);
      const start = (samples.length - 1) * SAMPLE_STEP;

      // Integración por punto medio: el rumbo se actualiza en dos mitades
      for (let i = 0; i < steps; i++) {
        heading += (curvature * SAMPLE_STEP) / 2;
        x += Math.sin(heading) * SAMPLE_STEP;
        z -= Math.cos(heading) * SAMPLE_STEP;
        heading += (curvature * SAMPLE_STEP) / 2;
        samples.push({ x, z, heading, curvature, kind: segment.kind });
      }

      if (segment.kind === 'corner') {
        corners.push({
          index: corners.length,
          start,
          end: start + steps * SAMPLE_STEP,
          direction: segment.direction,
        });
      }
    }

    return new Track(samples, corners, (samples.length - 1) * SAMPLE_STEP);
  }

  private static measure(segment: TrackSegment): { length: number; angle: number } {
    switch (segment.kind) {
      case 'straight':
        return { length: segment.length, angle: 0 };
      case 'corner': {
        const angle = (segment.direction * Math.PI) / 2;
        return { length: CORNER_RADIUS * Math.abs(angle), angle };
      }
      case 'arc': {
        const angle = (segment.angleDeg * Math.PI) / 180;
        return { length: segment.radius * Math.abs(angle), angle };
      }
    }
  }

  pointAt(distance: number): TrackPoint {
    const { i, t } = this.locate(distance);
    const a = this.samples[i];
    const b = this.samples[i + 1];
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      heading: a.heading + (b.heading - a.heading) * t,
    };
  }

  /** Posición en el mundo de un punto desplazado lateralmente (positivo = derecha). */
  worldAt(distance: number, lateral: number): TrackPoint {
    const p = this.pointAt(distance);
    return {
      x: p.x + Math.cos(p.heading) * lateral,
      z: p.z + Math.sin(p.heading) * lateral,
      heading: p.heading,
    };
  }

  sampleAt(distance: number): TrackSample {
    const { i } = this.locate(distance);
    return this.samples[i + 1];
  }

  /** Curva de 90° que contiene la distancia, o que empieza en menos de `lookAhead` metros. */
  cornerNear(distance: number, lookAhead: number): CornerZone | undefined {
    return this.corners.find((c) => distance >= c.start - lookAhead && distance < c.end);
  }

  private locate(distance: number): { i: number; t: number } {
    const last = this.samples.length - 1;
    const f = Math.min(Math.max(distance / SAMPLE_STEP, 0), last - 1e-6);
    const i = Math.floor(f);
    return { i, t: f - i };
  }
}
