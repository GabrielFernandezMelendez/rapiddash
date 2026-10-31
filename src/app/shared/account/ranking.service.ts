import { inject, Injectable } from '@angular/core';
import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import { RankingBoard, Standing } from '../../core/application/use-cases/ranking-board';
import { RivalGhost } from '../../core/application/use-cases/race-session';
import { flagEmoji } from '../../core/domain/profile/country';
import { RankedRecord, RankingView, RivalChoice } from '../../core/domain/race/ranking';
import { AccountService } from './account.service';

/** Rival elegido para un mapa: un piloto de la nube o mi mejor vuelta. */
export interface RivalPick {
  readonly choice: RivalChoice;
  /** null cuando es mi mejor vuelta. */
  readonly ranked: RankedRecord | null;
}

/**
 * Ranking online para las pantallas: carga el de cada mapa, recuerda el rival elegido (entre la
 * pantalla de mapas y la carrera, y entre sesiones) y descarga su fantasma.
 */
@Injectable({ providedIn: 'root' })
export class RankingService {
  private readonly account = inject(AccountService);
  private readonly settings = inject(SettingsRepository);
  private readonly board = new RankingBoard(inject(CloudRecordRepository));
  private readonly views = new Map<string, RankingView>();
  private readonly picks = new Map<string, RivalPick | null>();

  myUid(): string | null {
    return this.account.profile()?.uid ?? null;
  }

  async load(mapId: string): Promise<RankingView> {
    const view = await this.board.load(mapId, this.myUid());
    this.views.set(mapId, view);
    return view;
  }

  /** Último ranking cargado de ese mapa (para saber mi puesto antes de mejorar). */
  lastView(mapId: string): RankingView | null {
    return this.views.get(mapId) ?? null;
  }

  rememberedChoice(mapId: string): RivalChoice | null {
    return this.settings.getRival(mapId);
  }

  /** Guarda el rival de la próxima carrera; `rememberAs` es la clave con la que se recuerda la elección. */
  pick(mapId: string, pick: RivalPick | null, rememberAs = mapId): void {
    this.picks.set(mapId, pick);
    if (pick) this.settings.setRival(rememberAs, pick.choice);
  }

  picked(mapId: string): RivalPick | null {
    return this.picks.get(mapId) ?? null;
  }

  /** Fantasma del rival con su etiqueta; null si no se puede descargar (se corre contra mi mejor). */
  async rivalGhost(ranked: RankedRecord): Promise<RivalGhost | null> {
    const frames = await this.board.ghostOf(ranked.record);
    return frames ? { frames, label: rivalLabel(ranked) } : null;
  }

  standing(mapId: string, time: number): Promise<Standing | null> {
    const previousRank = this.views.get(mapId)?.me?.rank ?? null;
    return this.board.standing(mapId, time, previousRank);
  }
}

/** «🇦🇷 Nico · #22». */
export function rivalLabel({ rank, record }: RankedRecord): string {
  const flag = record.country ? `${flagEmoji(record.country)} ` : '';
  return `${flag}${record.nickname} · #${rank}`;
}
