import {
  FINISH_RUNOFF,
  halfWidthFor,
  SAMPLE_STEP,
  START_DISTANCE,
  TRACK_HALF_WIDTH,
} from './track-constants';
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
  /** Los embudos se muestrean como rectas. */
  readonly kind: Exclude<SegmentKind, 'corner' | 'taper'>;
  /** Distancia del eje a cada muro en este punto (5 carriles: 5,5 m; 3 carriles: 3,3 m). */
  readonly halfWidth: number;
}

/**
 * Cruce cuadrado al final de un tramo (curva de 90°).
 * Se describe en las coordenadas del tramo de entrada: `distance > leg.length` es avance dentro
 * del cruce (0 … 2 × halfWidth) y el lado `direction` está abierto hacia el tramo siguiente.
 */
export interface Junction {
  readonly direction: TurnDirection;
  /** Mitad del lado del cruce: el ancho de la carretera al llegar a él. */
  readonly halfWidth: number;
  /** Centro del borde de entrada del cruce. */
  readonly x: number;
  readonly z: number;
  readonly heading: number;
}

/** Tramo continuo de carretera (rectas y arcos) entre dos cruces. */
export interface Leg {
  readonly index: number;
  readonly samples: readonly TrackSample[];
  readonly length: number;
  /** Progreso acumulado de la pista al empezar el tramo. */
  readonly startProgress: number;
  readonly junction: Junction | null;
  /** Embudos y ensanches del tramo, en distancia dentro del tramo. */
  readonly tapers: readonly Taper[];
}

/** Cambio de ancho: de `fromHalfWidth` a `toHalfWidth` entre `start` y `end`. */
export interface Taper {
  readonly start: number;
  readonly end: number;
  readonly fromHalfWidth: number;
  readonly toHalfWidth: number;
}

export interface TrackPoint {
  readonly x: number;
  readonly z: number;
  readonly heading: number;
}

export class Track {
  private constructor(readonly legs: readonly Leg[]) {}

  readonly startDistance = START_DISTANCE;

  get lastLeg(): Leg {
    return this.legs[this.legs.length - 1];
  }

  /** Distancia de la meta dentro del último tramo. */
  get finishDistance(): number {
    return this.lastLeg.length - FINISH_RUNOFF;
  }

  /** Progreso total de la meta (para el fantasma y los tiempos). */
  get finishProgress(): number {
    return this.lastLeg.startProgress + this.finishDistance;
  }

  get junctions(): Junction[] {
    return this.legs.flatMap((l) => (l.junction ? [l.junction] : []));
  }

  static fromSegments(segments: readonly TrackSegment[]): Track {
    const legs: Leg[] = [];
    let x = 0;
    let z = 0;
    let heading = 0;
    let halfWidth = TRACK_HALF_WIDTH;
    let samples: TrackSample[] = [{ x, z, heading, curvature: 0, kind: 'straight', halfWidth }];
    let tapers: Taper[] = [];
    let progress = 0;

    const closeLeg = (junction: Junction | null) => {
      const length = (samples.length - 1) * SAMPLE_STEP;
      legs.push({ index: legs.length, samples, length, startProgress: progress, junction, tapers });
      progress += length;
    };

    for (const segment of segments) {
      if (segment.kind === 'corner') {
        const d = segment.direction;
        const H = halfWidth;
        closeLeg({ direction: d, halfWidth: H, x, z, heading });
        // El tramo siguiente empieza en el centro del lado abierto del cruce
        x += Math.sin(heading) * H + Math.cos(heading) * d * H;
        z += -Math.cos(heading) * H + Math.sin(heading) * d * H;
        heading += (d * Math.PI) / 2;
        samples = [{ x, z, heading, curvature: 0, kind: 'straight', halfWidth }];
        tapers = [];
        continue;
      }
      const from = halfWidth;
      const to = segment.kind === 'taper' ? halfWidthFor(segment.lanes) : halfWidth;
      const legDistance = (samples.length - 1) * SAMPLE_STEP;
      const { length, angle } =
        segment.kind !== 'arc'
          ? { length: segment.length, angle: 0 }
          : {
              length: segment.radius * Math.abs((segment.angleDeg * Math.PI) / 180),
              angle: (segment.angleDeg * Math.PI) / 180,
            };
      const steps = Math.max(1, Math.round(length / SAMPLE_STEP));
      const curvature = angle / (steps * SAMPLE_STEP);
      const kind = segment.kind === 'arc' ? 'arc' : 'straight';
      // Integración por punto medio: el rumbo se actualiza en dos mitades
      for (let i = 0; i < steps; i++) {
        heading += (curvature * SAMPLE_STEP) / 2;
        x += Math.sin(heading) * SAMPLE_STEP;
        z -= Math.cos(heading) * SAMPLE_STEP;
        heading += (curvature * SAMPLE_STEP) / 2;
        halfWidth = from + ((to - from) * (i + 1)) / steps;
        samples.push({ x, z, heading, curvature, kind, halfWidth });
      }
      if (to !== from) {
        tapers.push({
          start: legDistance,
          end: legDistance + steps * SAMPLE_STEP,
          fromHalfWidth: from,
          toHalfWidth: to,
        });
      }
    }
    closeLeg(null);
    return new Track(legs);
  }

  pointAt(leg: number, distance: number): TrackPoint {
    const l = this.legs[leg];
    const { i, t } = this.locate(l, distance);
    const a = l.samples[i];
    const b = l.samples[i + 1] ?? a;
    return {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t,
      heading: a.heading + (b.heading - a.heading) * t,
    };
  }

  /**
   * Posición en el mundo de un punto del tramo desplazado lateralmente (positivo = derecha).
   * Funciona también dentro del cruce (distance > length), con el rumbo del tramo de entrada.
   */
  worldAt(leg: number, distance: number, lateral: number): TrackPoint {
    const l = this.legs[leg];
    if (l.junction && distance > l.length) {
      const j = l.junction;
      const f = distance - l.length;
      return {
        x: j.x + Math.sin(j.heading) * f + Math.cos(j.heading) * lateral,
        z: j.z - Math.cos(j.heading) * f + Math.sin(j.heading) * lateral,
        heading: j.heading,
      };
    }
    const p = this.pointAt(leg, distance);
    return {
      x: p.x + Math.cos(p.heading) * lateral,
      z: p.z + Math.sin(p.heading) * lateral,
      heading: p.heading,
    };
  }

  /** Distancia del eje a cada muro. Dentro del cruce, la mitad de su lado. */
  halfWidthAt(leg: number, distance: number): number {
    const l = this.legs[leg];
    if (l.junction && distance > l.length) return l.junction.halfWidth;
    const { i, t } = this.locate(l, distance);
    const a = l.samples[i];
    const b = l.samples[i + 1] ?? a;
    return a.halfWidth + (b.halfWidth - a.halfWidth) * t;
  }

  sampleAt(leg: number, distance: number): TrackSample {
    const l = this.legs[leg];
    const { i } = this.locate(l, distance);
    return l.samples[Math.min(i + 1, l.samples.length - 1)];
  }

  /** Progreso global: crece a lo largo de la pista y se detiene dentro de los cruces. */
  progress(leg: number, distance: number): number {
    const l = this.legs[leg];
    return l.startProgress + Math.min(distance, l.length);
  }

  private locate(leg: Leg, distance: number): { i: number; t: number } {
    const last = leg.samples.length - 1;
    if (last === 0) return { i: 0, t: 0 };
    const f = Math.min(Math.max(distance / SAMPLE_STEP, 0), last - 1e-6);
    const i = Math.floor(f);
    return { i, t: f - i };
  }
}
