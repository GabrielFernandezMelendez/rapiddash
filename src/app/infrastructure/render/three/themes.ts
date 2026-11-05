export interface ScenePalette {
  readonly sky: number;
  readonly fogNear: number;
  readonly fogFar: number;
  readonly ground: number;
  readonly road: readonly [number, number];
  readonly lane: number;
  readonly leaf: number;
  readonly trunk: number;
  readonly rock: number;
  readonly sign: string;
  /** Proporción de árboles frente a rocas en el decorado. */
  readonly treeRatio: number;
  readonly seed: number;
  /** Muros de neón: sin luz, un color por lado y un halo en el suelo. */
  readonly neon: { readonly left: number; readonly right: number };
}

/** Generador pseudoaleatorio con semilla: el decorado es siempre el mismo para cada mapa. */
export function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
