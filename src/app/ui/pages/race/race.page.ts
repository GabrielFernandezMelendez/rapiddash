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
import { AudioPort } from '../../../core/application/ports/out/audio.port';
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { SettingsRepository } from '../../../core/application/ports/out/settings.repository';
import { showTutorialBeforeRace } from '../../../core/domain/settings/tutorial';
import { GameLoopPort } from '../../../core/application/ports/out/game-loop.port';
import { InputPort } from '../../../core/application/ports/out/input.port';
import { RendererPort } from '../../../core/application/ports/out/renderer.port';
import { RaceSession, RaceViewState } from '../../../core/application/use-cases/race-session';
import { Standing } from '../../../core/application/use-cases/ranking-board';
import { RankedRecord } from '../../../core/domain/race/ranking';
import { findMap } from '../../../core/domain/track/race-map';
import { Track } from '../../../core/domain/track/track';
import { provideRaceAdapters } from '../../../infrastructure/di/race.providers';
import { AccountService } from '../../../shared/account/account.service';
import { CloudRecordsService } from '../../../shared/account/cloud-records.service';
import { RankingService } from '../../../shared/account/ranking.service';
import { AestheticService } from '../../../shared/aesthetic/aesthetic.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { Countdown } from '../../organisms/countdown/countdown';
import { Tutorial } from '../../organisms/tutorial/tutorial';
import { Hud } from '../../organisms/hud/hud';
import { ResultsPanel } from '../../organisms/results-panel/results-panel';
import { RaceLayout } from '../../templates/race-layout/race-layout';

@Component({
  selector: 'rd-race-page',
  imports: [RaceLayout, Hud, Countdown, ResultsPanel, Tutorial],
  providers: [provideRaceAdapters()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-race-layout #surface>
      <div race-scene #scene class="scene"></div>
      @if (state(); as s) {
        <rd-hud [state]="s" [mapName]="mapName()" [rivalName]="rivalName()" (exit)="exit()" />
        <rd-countdown [phase]="s.phase" [light]="s.light" [showGo]="s.showGo" />
        @if (s.result; as result) {
          <rd-results-panel
            [result]="result"
            [standing]="standing()"
            [passedLabel]="passedLabel()"
            (retry)="retry()"
            (maps)="exit()"
          />
        }
      }
    </rd-race-layout>
    @if (tutorialOpen()) {
      <rd-tutorial (closed)="tutorialDone()" />
    }
  `,
  styles: `
    .scene {
      position: absolute;
      inset: 0;
    }
  `,
})
export class RacePage {
  /** Parámetro de ruta /race/:mapId (withComponentInputBinding). */
  readonly mapId = input.required<string>();

  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly aesthetic = inject(AestheticService);
  private readonly renderer = inject(RendererPort);
  private readonly controls = inject(InputPort);
  private readonly loop = inject(GameLoopPort);
  private readonly bestRuns = inject(BestRunRepository);
  private readonly audio = inject(AudioPort);
  private readonly cloudRecords = inject(CloudRecordsService);
  private readonly ranking = inject(RankingService);
  private readonly account = inject(AccountService);

  private readonly scene = viewChild.required<ElementRef<HTMLElement>>('scene');
  private readonly surface = viewChild.required(RaceLayout, { read: ElementRef<HTMLElement> });

  protected readonly state = signal<RaceViewState | null>(null);
  protected readonly map = computed(() => findMap(this.mapId()));
  protected readonly mapName = computed(() => {
    const map = this.map();
    return map ? this.i18n.t(map.nameKey) : '';
  });
  protected session: RaceSession | null = null;
  /** Apodo del rival de la nube contra el que se corre (null: mi mejor vuelta). */
  protected readonly rivalName = signal<string | null>(null);
  protected readonly standing = signal<Standing | null>(null);
  protected readonly passedLabel = computed(() => {
    const gained = this.standing()?.gained;
    if (!gained) return '';
    return gained === 1
      ? this.i18n.t('results.passedOne')
      : this.i18n.t('results.passed').replace('{n}', String(gained));
  });
  private lastResult: unknown = null;
  private readonly settings = inject(SettingsRepository);
  /** Tutorial antes de la primera carrera: el semáforo espera a que se cierre. */
  protected readonly tutorialOpen = signal(false);
  private tutorialClosed: (() => void) | null = null;

  constructor() {
    // El lienzo necesita el DOM real: arrancamos tras el primer render
    afterNextRender(() => void this.boot());
    inject(DestroyRef).onDestroy(() => {
      this.session?.stop();
      this.controls.dispose();
      this.renderer.dispose();
      this.audio.dispose();
    });
  }

  protected tutorialDone(): void {
    this.settings.setTutorialSeen();
    this.tutorialOpen.set(false);
    this.tutorialClosed?.();
  }

  /** «Repetir»: si hay siguiente rival, la próxima carrera es contra él. */
  protected async retry(): Promise<void> {
    const next = this.standing()?.next;
    if (next) {
      this.ranking.pick(this.mapId(), { choice: 'above', ranked: next });
      await this.useRival(next);
    }
    this.standing.set(null);
    this.session?.restart();
  }

  protected exit(): void {
    void this.router.navigate(['/maps']);
  }

  private async boot(): Promise<void> {
    const map = this.map();
    if (!map) {
      this.exit();
      return;
    }
    const track = Track.fromSegments(map.segments);
    const aesthetic = this.aesthetic.aesthetic();
    this.renderer.attach(this.scene().nativeElement, track, map.theme, aesthetic);
    this.controls.attach(this.surface().nativeElement as HTMLElement);
    const pick = this.ranking.picked(map.id);
    this.session = new RaceSession(map, track, {
      renderer: this.renderer,
      input: this.controls,
      loop: this.loop,
      bestRuns: this.bestRuns,
      audio: this.audio,
      records: this.cloudRecords,
    }, aesthetic);
    if (pick?.ranked) await this.useRival(pick.ranked);
    if (showTutorialBeforeRace(this.settings.getTutorialSeen())) {
      await new Promise<void>((resolve) => {
        this.tutorialClosed = resolve;
        this.tutorialOpen.set(true);
      });
    }
    await this.session.start((s) => this.onState(s));
  }

  /** Descarga el fantasma del rival (máximo 2,5 s); si no llega, se corre contra mi mejor vuelta. */
  private async useRival(ranked: RankedRecord): Promise<void> {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const ghost = await Promise.race([this.ranking.rivalGhost(ranked), timeout]);
    this.session?.useRival(ghost);
    this.rivalName.set(ghost ? ranked.record.nickname : null);
  }

  private onState(state: RaceViewState): void {
    this.state.set(state);
    const result = state.result;
    if (!result || result === this.lastResult) return;
    this.lastResult = result;
    // Puesto mundial con mi mejor tiempo (el nuevo si es récord)
    if (!this.account.profile()) return;
    const best = result.previousBest === null ? result.time : Math.min(result.time, result.previousBest);
    void this.ranking.standing(this.mapId(), best).then((s) => this.standing.set(s));
  }
}
