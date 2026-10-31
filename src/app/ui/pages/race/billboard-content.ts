import { RankingView } from '../../../core/domain/race/ranking';
import { BillboardContent, BillboardEntry } from '../../../core/domain/track/billboards';
import { StandingRow, Tournament } from '../../../core/domain/tournament/tournament';
import { formatTime } from '../../../shared/format-time';
import { I18nService } from '../../../shared/i18n/i18n.service';

/** Carteles de una carrera de torneo: 1.º y 2.º de la clasificación con sus puntos. */
export function tournamentBillboards(t: Tournament, rows: readonly StandingRow[], i18n: I18nService): BillboardContent {
  // Con 0 puntos todavía no hay líder
  const entry = (row: StandingRow | undefined): BillboardEntry | null =>
    row && row.total > 0
      ? {
          country: row.member.country,
          nickname: row.member.nickname,
          value: i18n.t('billboard.points').replace('{n}', String(row.total)),
        }
      : null;
  return {
    title: i18n.t('billboard.leaderOf').replace('{name}', t.name),
    secondTitle: i18n.t('billboard.second'),
    leader: entry(rows[0]),
    second: entry(rows[1]),
    emptyText: i18n.t('billboard.empty'),
  };
}

/** Carteles del ranking de un mapa (mundial) o del mapa del día: 1.º y 2.º con su tiempo. */
export function rankingBillboards(view: RankingView, daily: boolean, i18n: I18nService): BillboardContent {
  const entry = (i: number): BillboardEntry | null => {
    const r = view.top[i]?.record;
    return r ? { country: r.country, nickname: r.nickname, value: formatTime(r.time) } : null;
  };
  return {
    title: i18n.t(daily ? 'billboard.leaderDaily' : 'billboard.leaderWorld'),
    secondTitle: i18n.t('billboard.second'),
    leader: entry(0),
    second: entry(1),
    emptyText: i18n.t('billboard.empty'),
  };
}
