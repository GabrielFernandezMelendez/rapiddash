import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { GameLoopPort } from '../../../core/application/ports/out/game-loop.port';
import { RendererPort } from '../../../core/application/ports/out/renderer.port';
import { Duel, duelOutcome, DuelOutcome, duelStatus } from '../../../core/domain/duel/duel';
import { DEFAULT_GARAGE, GarageChoice } from '../../../core/domain/garage/garage';
import { CloudRecord } from '../../../core/domain/race/cloud-record';
import { GhostFrame, GhostPlayback } from '../../../core/domain/race/ghost';
import { createRace } from '../../../core/domain/race/race';
import { findMap, trackOf } from '../../../core/domain/track/race-map';
import { provideRaceAdapters } from '../../../infrastructure/di/race.providers';
import { DuelService } from '../../../shared/account/duel.service';
import { RankingService } from '../../../shared/account/ranking.service';
import { formatTime, NO_TIME } from '../../../shared/format-time';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { VictoryTitle } from '../../molecules/victory-title/victory-title';

/** Pausa al acabar la vuelta del ganador antes de que empiece otra vez (s). */
const REPLAY_PAUSE = 1.2;

/**
 * Final del duelo, la ven los dos: el coche del ganador repite en 3D su mejor vuelta, en bucle,
 * con el título animado encima. Sin fantasma (sin red) el coche espera en la salida.
 */
@Component({
  selector: 'rd-duel-victory-page',
  imports: [Button, Flag, VictoryTitle, TranslatePipe],
  providers: [provideRaceAdapters()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scene" #scene aria-hidden="true"></div>
    <div class="shade" aria-hidden="true"></div>
    <div class="overlay">
      @if (outcome(); as o) {
        <header class="head">
          <rd-victory-title [text]="titleKey() | t" />
          @if (winner(); as w) {
            <p class="who">
              <rd-flag [country]="w.country" />
              {{ w.nickname }}{{ w.uid === myUid ? ' ' + ('leaderboard.you' | t) : '' }}
            </p>
          }
        </header>
        <div class="bottom">
          <div class="score">
            @for (r of rows(); track r.uid) {
              <div class="row" [class.first]="o.kind === 'winner' && o.uid === r.uid">
                <span class="name"><rd-flag [country]="r.country" /> {{ r.nickname }}</span>
                <span class="time">{{ r.time }}</span>
              </div>
            }
          </div>
          <div class="buttons">
            <button rdButton type="button" (click)="again()">{{ 'duel.again' | t }}</button>
            <button rdButton variant="secondary" type="button" (click)="exit()">{{ 'duel.exit' | t }}</button>
          </div>
        </div>
      } @else if (failed()) {
        <p class="note">{{ 'leaderboard.offline' | t }}</p>
        <button rdButton variant="secondary" type="button" (click)="exit()">{{ 'duel.exit' | t }}</button>
      }
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      overflow: hidden;
      background: var(--rd-asphalt);
    }
    .scene,
    .shade {
      position: absolute;
      inset: 0;
    }
    /* Oscurece arriba y abajo para que el texto se lea sobre cualquier parte del circuito */
    .shade {
      pointer-events: none;
      background: linear-gradient(
        rgb(13 4 32 / 0.6),
        transparent 36%,
        transparent 66%,
        rgb(13 4 32 / 0.8)
      );
    }
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      padding: calc(24px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));
      pointer-events: none;
    }
    .head {
      display: grid;
      justify-items: center;
      gap: 12px;
    }
    .who {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: 26px;
      text-transform: uppercase;
      text-align: center;
      overflow-wrap: anywhere;
      text-shadow: 0 2px 8px #000;
    }
    .bottom {
      display: grid;
      gap: 10px;
      pointer-events: auto;
    }
    .score {
      display: grid;
      gap: 4px;
      padding: 10px 14px;
      border-radius: 12px;
      background: rgb(13 4 32 / 0.85);
      box-shadow: inset 0 0 0 1px var(--rd-line);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .row.first {
      color: var(--rd-signal);
      font-weight: 600;
    }
    .name {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .time {
      flex: none;
      font-family: var(--rd-font-hud-time);
      font-variant-numeric: tabular-nums;
    }
    .buttons {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .note {
      margin: auto 0 0;
      color: var(--rd-muted);
      text-align: center;
    }
    .overlay > button {
      pointer-events: auto;
    }
  `,
})
export class DuelVictoryPage {
  /** /duels/:code/victory (withComponentInputBinding). */
  readonly code = input.required<string>();

  private readonly router = inject(Router);
  private readonly renderer = inject(RendererPort);
  private readonly loop = inject(GameLoopPort);
  private readonly duels = inject(DuelService);
  private readonly ranking = inject(RankingService);
  private readonly sceneHost = viewChild.required<ElementRef<HTMLElement>>('scene');

  protected readonly myUid = this.duels.uid() ?? '';
  private readonly duel = signal<Duel | null>(null);
  private readonly scores = signal<CloudRecord[]>([]);
  protected readonly outcome = signal<DuelOutcome | null>(null);
  protected readonly failed = signal(false);

  protected readonly titleKey = computed(() => {
    const kind = this.outcome()?.kind;
    return kind === 'winner' ? 'duel.victory' : kind === 'draw' ? 'duel.draw' : 'duel.noWinner';
  });
  protected readonly winner = computed(() => {
    const o = this.outcome();
    return o?.kind === 'winner' ? (this.duel()?.members.find((m) => m.uid === o.uid) ?? null) : null;
  });
  protected readonly rows = computed(() => {
    const scores = this.scores();
    const members = [...(this.duel()?.members ?? [])];
    const timeOf = (uid: string) => scores.find((s) => s.uid === uid)?.time ?? Infinity;
    return members
      .sort((a, b) => timeOf(a.uid) - timeOf(b.uid))
      .map((m) => {
        const time = timeOf(m.uid);
        return { ...m, time: time === Infinity ? NO_TIME : formatTime(time) };
      });
  });

  constructor() {
    afterNextRender(() => void this.boot());
    inject(DestroyRef).onDestroy(() => {
      this.loop.stop();
      this.renderer.dispose();
    });
  }

  protected again(): void {
    void this.router.navigate(['/duels']);
  }

  protected exit(): void {
    void this.router.navigate(['/']);
  }

  private async boot(): Promise<void> {
    try {
      const duel = await this.duels.find(this.code());
      // Un enlace abierto antes de tiempo: a la pantalla del duelo
      if (!duel || duelStatus(duel, Date.now()) !== 'finished') {
        void this.router.navigate(['/duels', this.code()], { replaceUrl: true });
        return;
      }
      const scores = await this.duels.scores(duel);
      this.duel.set(duel);
      this.scores.set(scores);
      const outcome = duelOutcome(duel, scores);
      this.outcome.set(outcome);
      await this.showRun(duel, outcome, scores);
    } catch (e) {
      console.warn('[1 vs 1]', e);
      this.failed.set(true);
    }
  }

  /** Dibuja el circuito y, si hay ganador con fantasma, su coche repitiendo la vuelta en bucle. */
  private async showRun(duel: Duel, outcome: DuelOutcome, scores: readonly CloudRecord[]): Promise<void> {
    const map = findMap(duel.mapId);
    if (!map) return;
    const track = trackOf(map);
    const record = outcome.kind === 'winner' ? scores.find((s) => s.uid === outcome.uid) : undefined;
    const player = duel.players[outcome.kind === 'winner' ? outcome.uid : duel.ownerUid];
    const garage: GarageChoice = player ? { car: player.car, fx: player.fx } : DEFAULT_GARAGE;
    this.renderer.attach(this.sceneHost().nativeElement, track, map.theme, garage, map.terrain);

    const start = createRace(track).car;
    let frames: readonly GhostFrame[] | null = null;
    const replay = () => (frames ? new GhostPlayback(frames) : null);
    let playback: GhostPlayback | null = null;
    let time = 0;
    this.loop.start((dt) => {
      time += dt;
      const end = frames?.[frames.length - 1]?.time ?? 0;
      if (playback && time > end + REPLAY_PAUSE) time = 0;
      const pose = playback?.poseAt(time) ?? start;
      this.renderer.render(
        {
          car: {
            leg: pose.leg,
            distance: pose.distance,
            lateral: pose.lateral,
            yaw: pose.yaw,
            accelerating: !!playback && time <= end,
            recovering: false,
            scrapeSide: 0,
          },
          ghost: null,
          ghostLabel: null,
        },
        dt,
      );
    });
    // El fantasma llega cuando llega: mientras tanto el coche espera en la salida
    if (record) {
      const ghost = await this.ranking.rivalGhost({ rank: 1, record });
      frames = ghost?.frames ?? null;
      playback = replay();
      time = 0;
    }
  }
}
