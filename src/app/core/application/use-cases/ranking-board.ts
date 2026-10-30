import { CloudRecord } from '../../domain/race/cloud-record';
import { GhostFrame } from '../../domain/race/ghost';
import { isCurrentPhysics } from '../../domain/race/physics-version';
import {
  EMPTY_RANKING,
  LEADERBOARD_SIZE,
  placesGained,
  RankedRecord,
  RankingView,
} from '../../domain/race/ranking';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';

/** Cómo queda el piloto tras terminar una carrera. */
export interface Standing {
  readonly rank: number;
  /** Puestos que sube; null si es su primer tiempo en el mapa. */
  readonly gained: number | null;
  readonly total: number | null;
  /** El siguiente al que perseguir; null si ya es el 1.º. */
  readonly next: RankedRecord | null;
}

/**
 * Ranking de un mapa: el top 10, mi puesto y el de encima, y los fantasmas de los rivales.
 * Sin red devuelve lo que pueda (la caché de Firestore) y nunca lanza.
 */
export class RankingBoard {
  constructor(private readonly cloud: CloudRecordRepository) {}

  async load(mapId: string, myUid: string | null): Promise<RankingView> {
    const top = await this.cloud
      .top(mapId, LEADERBOARD_SIZE)
      .then((records) => records.map((record, i) => ({ rank: i + 1, record })))
      .catch(() => null);
    if (!top) return EMPTY_RANKING;

    let me: RankedRecord | null = null;
    let above: RankedRecord | null = null;
    const mine = myUid ? await this.cloud.mine(mapId, myUid).catch(() => null) : null;
    if (mine && isCurrentPhysics(mine)) {
      const inTop = top.find((r) => r.record.uid === myUid);
      const rank = inTop?.rank ?? (await this.cloud.rankOf(mapId, mine.time).catch(() => null));
      if (rank !== null) {
        me = { rank, record: mine };
        above = await this.aboveOf(mapId, me, top);
      }
    }
    const total = await this.cloud.count(mapId).catch(() => null);
    return { top, me, above, total };
  }

  /** Fantasma de un rival de la nube; null si no se puede descargar. */
  ghostOf(record: CloudRecord): Promise<GhostFrame[] | null> {
    return this.cloud.ghost(record.mapId, record.uid).catch(() => null);
  }

  /** Puesto con un tiempo recién hecho (aunque aún no esté subido) y siguiente rival. */
  async standing(mapId: string, time: number, previousRank: number | null): Promise<Standing | null> {
    try {
      const rank = await this.cloud.rankOf(mapId, time);
      const nextRecord = rank > 1 ? await this.cloud.above(mapId, time) : null;
      const total = await this.cloud.count(mapId).catch(() => null);
      return {
        rank,
        gained: placesGained(previousRank, rank),
        // Si aún no está subido, el total no me cuenta: como mínimo, mi puesto
        total: total === null ? null : Math.max(total, rank),
        next: nextRecord ? { rank: rank - 1, record: nextRecord } : null,
      };
    } catch {
      return null;
    }
  }

  private async aboveOf(
    mapId: string,
    me: RankedRecord,
    top: readonly RankedRecord[],
  ): Promise<RankedRecord | null> {
    if (me.rank <= 1) return null;
    const inTop = top[me.rank - 2];
    if (inTop) return inTop;
    const record = await this.cloud.above(mapId, me.record.time).catch(() => null);
    return record ? { rank: me.rank - 1, record } : null;
  }
}
