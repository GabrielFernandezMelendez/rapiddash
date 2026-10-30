import { CloudRecord } from './cloud-record';

export const LEADERBOARD_SIZE = 10;

/** Un récord con su puesto en el ranking del mapa (1 = el mejor). */
export interface RankedRecord {
  readonly rank: number;
  readonly record: CloudRecord;
}

/** Lo que se sabe del ranking de un mapa al abrirlo. */
export interface RankingView {
  readonly top: readonly RankedRecord[];
  /** Mi récord y mi puesto; null si aún no tengo tiempo en este mapa. */
  readonly me: RankedRecord | null;
  /** El de justo encima de mí; null si soy el 1.º o no lo sé. */
  readonly above: RankedRecord | null;
  /** Pilotos con tiempo en este mapa; null si no se sabe (sin red). */
  readonly total: number | null;
}

export const EMPTY_RANKING: RankingView = { top: [], me: null, above: null, total: null };

/** Contra quién se corre: el 1.º, el de justo encima o mi mejor vuelta. */
export type RivalChoice = 'top' | 'above' | 'mine';
export const RIVAL_CHOICES: readonly RivalChoice[] = ['top', 'above', 'mine'];

/** Rival de cada opción, o null si esa opción no está disponible. */
export interface RivalOptions {
  readonly top: RankedRecord | null;
  readonly above: RankedRecord | null;
  /** Mi mejor vuelta (en este móvil). */
  readonly mine: boolean;
}

export function rivalOptions(view: RankingView, myUid: string | null, hasLocalBest: boolean): RivalOptions {
  const first = view.top[0] ?? null;
  const top = first && first.record.uid !== myUid ? first : null;
  let above: RankedRecord | null;
  if (view.me) {
    // Si soy el 1.º no hay nadie encima
    above = view.me.rank > 1 ? view.above : null;
  } else {
    // Sin tiempo: el último del top, el más alcanzable
    above = view.top.at(-1) ?? null;
  }
  if (above?.record.uid === myUid) above = null;
  return { top, above, mine: hasLocalBest };
}

/**
 * Rival que se propone: el que eligió la última vez en este mapa si sigue disponible; si no, el
 * de justo encima, después su mejor vuelta y por último el 1.º. null: corre contra el reloj.
 */
export function defaultRival(options: RivalOptions, remembered: RivalChoice | null): RivalChoice | null {
  if (remembered && isAvailable(options, remembered)) return remembered;
  const order: RivalChoice[] = ['above', 'mine', 'top'];
  return order.find((c) => isAvailable(options, c)) ?? null;
}

export function isAvailable(options: RivalOptions, choice: RivalChoice): boolean {
  return choice === 'mine' ? options.mine : options[choice] !== null;
}

/** Filas de mi zona del ranking cuando no salgo en el top: el de encima y yo. */
export function nearRows(view: RankingView): RankedRecord[] {
  const me = view.me;
  if (!me || me.rank <= view.top.length) return [];
  return view.above && view.above.rank > view.top.length ? [view.above, me] : [me];
}

/** Puestos que se suben al mejorar (null si antes no tenía puesto). */
export function placesGained(previousRank: number | null, newRank: number): number | null {
  return previousRank === null ? null : Math.max(0, previousRank - newRank);
}

/** La etiqueta sobre el fantasma se ve en la salida y se desvanece entre 2,5 y 3 s de carrera. */
export const GHOST_LABEL_HOLD = 2.5;
export const GHOST_LABEL_FADE = 0.5;

export function ghostLabelOpacity(raceTime: number): number {
  if (raceTime <= GHOST_LABEL_HOLD) return 1;
  return Math.max(0, 1 - (raceTime - GHOST_LABEL_HOLD) / GHOST_LABEL_FADE);
}
