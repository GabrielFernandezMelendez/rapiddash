import {
  FINISH_RUNOFF,
  halfWidthFor,
  SAMPLE_STEP,
  START_DISTANCE,
  START_LINE,
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

/** Datos de un circuito cerrado (mapas por vueltas). */
export interface CircuitInfo {
  readonly laps: number;
  /** Metros de una vuelta. */
  readonly lapLength: number;
  /** Una sola vuelta, para dibujarla (la pista de la carrera repite sus tramos en cada vuelta). */
  readonly lapTrack: Track;
}

export class Track {
  private constructor(
    readonly legs: readonly Leg[],
    /** null en los mapas de ida (de la salida a la meta). */
    readonly circuit: CircuitInfo | null = null,
  ) {}

  readonly startDistance = START_DISTANCE;

  get lastLeg(): Leg {
    return this.legs[this.legs.length - 1];
  }

  /** Distancia de la meta dentro del último tramo. */
  get finishDistance(): number {
    return this.lastLeg.length - FINISH_RUNOFF;
  }

  /** Progreso total de la meta (para el fantasma y los tiempos). En un circuito, la línea de salida tras la última vuelta. */
  get finishProgress(): number {
    if (this.circuit) return START_LINE + this.circuit.laps * this.circuit.lapLength;
    return this.lastLeg.startProgress + this.finishDistance;
  }

  /** Vuelta en curso (de 1 a laps) con ese progreso; siempre 1 fuera de los circuitos. */
  lapAt(progress: number): number {
    const c = this.circuit;
    if (!c) return 1;
    return Math.min(c.laps, Math.max(1, Math.floor((progress - START_LINE) / c.lapLength) + 1));
  }

  /** Progreso en el que empieza la vuelta `lap` (la línea de salida tras lap - 1 vueltas). */
  lapStartProgress(lap: number): number {
    return START_LINE + (lap - 1) * (this.circuit?.lapLength ?? 0);
  }

  /**
   * Circuito cerrado de `laps` vueltas. Las piezas son una vuelta y deben acabar en una recta que
   * vuelva a la salida con el mismo rumbo (giros que suman 360°). Ese último tramo se une al primero
   * (sin cruce entre medias) y se endereza lo poco que haga falta (medio metro como mucho, por el
   * redondeo de las muestras) para que cierre exacto. Cada vuelta repite los mismos tramos, con el
   * rumbo sumando una vuelta entera: así la geometría no se desvía de una vuelta a otra.
   */
  static circuit(segments: readonly TrackSegment[], laps: number): Track {
    const lap = Track.fromSegments(segments).legs;
    const n = lap.length;
    const first = lap[0];
    const last = lap[n - 1];
    if (n < 2 || last.junction || last.samples.length < 2) {
      throw new Error('Un circuito debe tener cruces o curvas y acabar en una recta');
    }
    const end = last.samples[last.samples.length - 1];
    const start = first.samples[0];
    const m = last.samples.length - 1;
    const dx = start.x - end.x;
    const dz = start.z - end.z;
    const closedLast: Leg = {
      ...last,
      samples: last.samples.map((p, i) => ({ ...p, x: p.x + (dx * i) / m, z: p.z + (dz * i) / m })),
    };
    const lapLength = lap.reduce((sum, l) => sum + l.length, 0);
    const turned = (leg: Leg, k: number): Leg => {
      const extra = k * 2 * Math.PI;
      return k === 0
        ? leg
        : {
            ...leg,
            samples: leg.samples.map((p) => ({ ...p, heading: p.heading + extra })),
            junction: leg.junction && { ...leg.junction, heading: leg.junction.heading + extra },
          };
    };
    const joined = (k: number): Omit<Leg, 'index' | 'startProgress'> => {
      const a = turned(closedLast, k);
      const b = turned(first, k + 1);
      return {
        samples: [...a.samples, ...b.samples.slice(1)],
        length: a.length + b.length,
        junction: b.junction,
        tapers: [
          ...a.tapers,
          ...b.tapers.map((t) => ({ ...t, start: t.start + a.length, end: t.end + a.length })),
        ],
      };
    };
    const parts: Omit<Leg, 'index' | 'startProgress'>[] = [first];
    for (let k = 0; k < laps; k++) {
      for (let i = 1; i < n - 1; i++) parts.push(turned(lap[i], k));
      parts.push(joined(k));
    }
    const lapTrack = new Track(Track.numbered([...lap.slice(0, n - 1), closedLast]));
    return new Track(Track.numbered(parts), { laps, lapLength, lapTrack });
  }

  /** Índices y progreso acumulado de una lista de tramos. */
  private static numbered(parts: readonly Omit<Leg, 'index' | 'startProgress'>[]): Leg[] {
    let progress = 0;
    return parts.map((p, index) => {
      const leg = { ...p, index, startProgress: progress };
      progress += p.length;
      return leg;
    });
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
