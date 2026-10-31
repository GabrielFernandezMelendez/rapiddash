import { Tournament, TournamentStatus, statusAt, dayIndex, dayRemaining } from '../../../core/domain/tournament/tournament';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { formatClock } from '../../organisms/more-attempts/more-attempts';
import { findMap } from '../../../core/domain/track/race-map';

/** Textos de un torneo para las tarjetas y la pantalla (estado y línea de detalle). */
export function describeTournament(
  t: Tournament,
  i18n: I18nService,
  now: number,
): { status: TournamentStatus; statusLabel: string; detail: string } {
  const status = statusAt(t, now);
  const statusLabel = i18n.t(`tournament.status.${status}`);
  if (status === 'waiting') {
    const owner = t.members.find((m) => m.uid === t.ownerUid)?.nickname ?? '';
    return {
      status,
      statusLabel,
      detail: i18n
        .t('tournament.waitingDetail')
        .replace('{owner}', owner)
        .replace('{n}', String(t.members.length)),
    };
  }
  if (status === 'running') {
    const day = dayIndex(t, now) ?? 0;
    const map = findMap(t.mapIds[day] ?? '');
    return {
      status,
      statusLabel,
      detail: i18n
        .t('tournament.runningDetail')
        .replace('{day}', String(day + 1))
        .replace('{map}', map ? i18n.t(map.nameKey) : '')
        .replace('{left}', formatClock(dayRemaining(t, now)).slice(0, -3)),
    };
  }
  return { status, statusLabel, detail: i18n.t('tournament.finishedDetail').replace('{n}', String(t.members.length)) };
}
