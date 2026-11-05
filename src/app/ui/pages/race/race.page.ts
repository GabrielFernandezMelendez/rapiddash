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
import { TournamentBoard } from '../../../core/application/use-cases/tournaments';
import { RankedRecord } from '../../../core/domain/race/ranking';
import { BestRun } from '../../../core/domain/race/ghost';
import { findMap, trackOf } from '../../../core/domain/track/race-map';
import { provideRaceAdapters } from '../../../infrastructure/di/race.providers';
import { AccountService } from '../../../shared/account/account.service';
import { CloudRecordsService } from '../../../shared/account/cloud-records.service';
import { DailyService } from '../../../shared/account/daily.service';
import { GarageService } from '../../../shared/garage/garage.service';
import { RankingService } from '../../../shared/account/ranking.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { Countdown } from '../../organisms/countdown/countdown';
import { Tutorial } from '../../organisms/tutorial/tutorial';
import { MoreAttempts } from '../../organisms/more-attempts/more-attempts';
import { ALL_MAPS } from '../../../core/domain/track/race-map';
import { dayBoardId, dayIndex, isMember, statusAt, Tournament } from '../../../core/domain/tournament/tournament';
import { rankingBillboards, tournamentBillboards } from './billboard-content';
import { leaderOf } from '../../../core/domain/tournament/leader-photo';
import { TournamentService } from '../../../shared/account/tournament.service';
import { DuelService } from '../../../shared/account/duel.service';
import { canRaceDuel, duelBoardId, rivalOf } from '../../../core/domain/duel/duel';
import { flagEmoji } from '../../../core/domain/profile/country';
import { Hud } from '../../organisms/hud/hud';
import { LapBannerComponent } from '../../organisms/lap-banner/lap-banner';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { ResultsPanel } from '../../organisms/results-panel/results-panel';
import { RaceLayout } from '../../templates/race-layout/race-layout';
import { PrizeRoulette } from '../../organisms/prize-roulette/prize-roulette';
import { Prize, prizeKey } from '../../../core/domain/garage/garage';
import { prizeReel } from '../../../core/domain/garage/prize-reel';
import { dailyCube } from '../../../core/domain/daily/daily-cube';

/** Milisegundos que se ve «¡Meta!» antes de los resultados en un circuito. */
const FINISH_BANNER_MS = 1300;

@Component({
  selector: 'rd-race-page',
  imports: [RaceLayout, Hud, Countdown, ResultsPanel, Tutorial, MoreAttempts, LapBannerComponent, PrizeRoulette, TranslatePipe],
  providers: [provideRaceAdapters()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-race-layout #surface>
      <div race-scene #scene class="scene"></div>
      @if (state(); as s) {
        <rd-hud [state]="s" [mapName]="mapName()" [rivalName]="rivalName()" (exit)="exit()" />
        <rd-countdown [phase]="s.phase" [light]="s.light" [showGo]="s.showGo" />
        @if (s.lapBanner; as b) {
          <rd-lap-banner
            [kind]="b.kind"
            [lap]="b.lap"
            [total]="b.total"
            [time]="b.lapTime"
            [delta]="b.delta"
          />
        }
        @if (finishBanner() && s.result; as result) {
          <rd-lap-banner kind="finish" [time]="result.time" [note]="result.isRecord ? ('results.record' | t) : ''" />
        }
        @if (s.result && !finishBanner()) {
          <rd-results-panel
            [result]="s.result!"
            [standing]="standing()"
            [passedLabel]="passedLabel()"
            (retry)="retry()"
            (maps)="exit()"
          />
          @if (won(); as w) {
            <rd-prize-roulette
              [prize]="w.prize"
              [reel]="w.reel"
              (tick)="audio.prizeTick()"
              (revealed)="audio.prizeReveal()"
              (finished)="openPrize(w.prize)"
            />
          }
        }
      }
    </rd-race-layout>
    @if (tutorialOpen()) {
      <rd-tutorial (closed)="tutorialDone()" />
    }
    @if (askMore()) {
      <rd-more-attempts
        [mapName]="mapName()"
        [waitMs]="dailyService.waitRemaining()"
        [busy]="adBusy()"
        (watch)="watchAd()"
        (wait)="leaveDaily()"
      />
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
  /** ?daily=1: carrera del mapa del día (cuenta en su ranking y gasta intentos). */
  readonly daily = input<string | undefined>();
  /** ?t=CODIGO: carrera del día de un torneo (intentos ilimitados, cuenta su mejor tiempo). */
  readonly t = input<string | undefined>();
  /** ?duel=CODIGO: un intento de un 1 vs 1 (se gasta al salir; cuenta su mejor tiempo). */
  readonly duel = input<string | undefined>();

  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly renderer = inject(RendererPort);
  private readonly controls = inject(InputPort);
  private readonly loop = inject(GameLoopPort);
  private readonly bestRuns = inject(BestRunRepository);
  protected readonly audio = inject(AudioPort);
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
  /** En un circuito, «¡Meta!» se ve un momento antes de la ventana de resultados. */
  protected readonly finishBanner = signal(false);
  /** Premio del cubo azul en esta carrera: la ruleta sale al acabar, sobre los resultados. */
  protected readonly won = signal<{ prize: Prize; reel: readonly Prize[] } | null>(null);
  /** Día del mapa del día que se está corriendo (null fuera de él). */
  private dailyKey: string | null = null;
  protected readonly dailyService = inject(DailyService);
  private readonly garage = inject(GarageService);
  protected readonly askMore = signal(false);
  protected readonly adBusy = signal(false);
  /** Ranking donde cuenta esta carrera: el del mapa o el del día. */
  private boardId = '';
  /** Torneo en el que cuenta esta carrera (null fuera de torneo). */
  private tournamentCode: string | null = null;
  private tournament: Tournament | null = null;
  private readonly tournaments = inject(TournamentService);
  private readonly duels = inject(DuelService);
  /** Duelo en el que cuenta esta carrera (null fuera de un 1 vs 1). */
  private duelCode: string | null = null;
  /** Récord subiéndose: el duelo no se da por acabado hasta que esté en la nube. */
  private publishing: Promise<void> = Promise.resolve();
  /** Pidiendo otro intento a la nube: otro swipe mientras tanto no gasta uno más. */
  private duelRestarting = false;
  /** Sube con cada intento gastado desde esta pantalla. */
  private duelRun = 0;
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
      this.audio.stopRace();
      // Al salir, por si era el último intento (también si se abandona a medias)
      void this.closeDuelRun();
    });
  }

  protected tutorialDone(): void {
    this.settings.setTutorialSeen();
    this.tutorialOpen.set(false);
    this.tutorialClosed?.();
  }

  /** «Repetir»: si hay siguiente rival, la próxima carrera es contra él. */
  protected async retry(): Promise<void> {
    if (this.duelCode) {
      // Sin intentos, «Repetir» lleva a la pantalla del duelo
      if (await this.startDuelRun()) {
        // Puede que el rival haya mejorado mientras corría
        await this.useDuelRival(this.duelCode);
        this.standing.set(null);
        this.session?.restart();
      } else if (!this.duelRestarting) this.exit();
      return;
    }
    if (this.tournamentCode) {
      // En el torneo se corre sin límite y contra el mismo rival
      this.standing.set(null);
      this.session?.restart();
      return;
    }
    if (this.isDaily()) {
      // En el mapa del día cada carrera gasta un intento
      if (!this.dailyService.startAttempt()) {
        this.askMore.set(true);
        return;
      }
      this.standing.set(null);
      this.session?.restart();
      return;
    }
    const next = this.standing()?.next;
    if (next) {
      this.ranking.pick(this.mapId(), { choice: 'above', ranked: next });
      await this.useRival(next);
    }
    this.standing.set(null);
    this.session?.restart();
  }

  /**
   * Swipe largo hacia abajo en carrera: empieza otra vez contra el mismo rival. En el mapa del día
   * gasta un intento como cualquier salida; sin intentos no hace nada y la carrera sigue.
   */
  private quickRestart(): void {
    if (this.duelCode) {
      void this.quickRestartDuel();
      return;
    }
    if (!this.tournamentCode && this.isDaily() && !this.dailyService.startAttempt()) return;
    this.session?.restart();
  }

  /** Tras la ruleta, al garaje. `replaceUrl`: volver atrás no repite la carrera ni gasta un intento. */
  protected openPrize(prize: Prize): void {
    void this.router.navigate(['/garage'], {
      queryParams: { prize: prizeKey(prize) },
      replaceUrl: true,
    });
  }

  /** Gasta un intento en la nube, así que tarda un momento; mientras, la carrera sigue. */
  private async quickRestartDuel(): Promise<void> {
    if (await this.startDuelRun()) this.session?.restart();
  }

  /**
   * Gasta un intento; false si no se puede (sin intentos o sin red) o si ya se está pidiendo uno:
   * un doble toque en «Repetir» o un segundo swipe no gastan otro.
   */
  private async startDuelRun(): Promise<boolean> {
    const code = this.duelCode;
    if (!code || this.duelRestarting) return false;
    this.duelRestarting = true;
    // Un aviso de «ya he acabado» aún pendiente es de la carrera anterior: se descarta
    this.duelRun++;
    try {
      return await this.duels.startAttempt(code).catch(() => false);
    } finally {
      this.duelRestarting = false;
    }
  }

  /** Corro contra la mejor vuelta del rival si ya tiene tiempo (si no, contra la mía). */
  private async useDuelRival(code: string): Promise<void> {
    try {
      const duel = await this.duels.find(code);
      const rival = duel && rivalOf(duel, this.account.profile()?.uid ?? '');
      if (!duel || !rival) return;
      const record = (await this.duels.scores(duel)).find((s) => s.uid === rival.uid);
      if (!record) return;
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      const ghost = await Promise.race([this.ranking.rivalGhost({ rank: 1, record }), timeout]);
      if (!ghost) return;
      const flag = rival.country ? `${flagEmoji(rival.country)} ` : '';
      this.session?.useRival({ frames: ghost.frames, label: `${flag}${rival.nickname}` });
      this.rivalName.set(rival.nickname);
    } catch {
      // El fantasma es un extra: sin él se corre igual
    }
  }

  /**
   * Avisa de que ya he acabado (solo cuenta si no me quedan intentos). Da tiempo a que empiece a
   * subirse el récord y lo espera, para que el rival no vea el final sin mi último tiempo.
   */
  private async closeDuelRun(): Promise<void> {
    const code = this.duelCode;
    if (!code) return;
    const run = this.duelRun;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await this.publishing;
    // Si entretanto ha salido otra vez (el último intento), este aviso ya no vale: lo cerraría en marcha
    if (run !== this.duelRun) return;
    await this.duels.markDone(code).catch(() => undefined);
  }

  protected exit(): void {
    if (this.duelCode) void this.router.navigate(['/duels', this.duelCode]);
    else if (this.tournamentCode) void this.router.navigate(['/tournaments', this.tournamentCode]);
    else void this.router.navigate([this.isDaily() ? '/daily' : '/maps']);
  }

  protected async watchAd(): Promise<void> {
    this.adBusy.set(true);
    const ok = await this.dailyService.watchAd();
    this.adBusy.set(false);
    if (!ok) return;
    this.askMore.set(false);
    void this.retry();
  }

  protected leaveDaily(): void {
    this.askMore.set(false);
    void this.router.navigate(['/daily']);
  }

  /** Carrera con ranking propio (mapa del día o día de torneo). */
  private isDaily(): boolean {
    return this.boardId !== '' && this.boardId !== this.map()?.id;
  }

  private async boot(): Promise<void> {
    const map = this.map();
    if (!map) {
      this.exit();
      return;
    }
    this.boardId = map.id;
    if (this.daily()) {
      const today = this.dailyService.today(ALL_MAPS);
      // Enlace viejo (otro día) o sin intentos: de vuelta a la pantalla del mapa del día
      if (today.mapId !== map.id || !this.dailyService.startAttempt()) {
        void this.router.navigate(['/daily']);
        return;
      }
      this.boardId = today.boardId;
      this.dailyKey = today.key;
    } else if (this.t()) {
      const boardId = await this.tournamentBoard(this.t()!, map.id);
      // Torneo que no está en curso, mapa de otro día o no soy miembro: a la pantalla del torneo
      if (!boardId) {
        void this.router.navigate(['/tournaments', this.t()]);
        return;
      }
      this.boardId = boardId;
      this.tournamentCode = this.t()!.toUpperCase();
    } else if (this.duel()) {
      const code = this.duel()!.toUpperCase();
      const duel = await this.duels.find(code).catch(() => null);
      const uid = this.account.profile()?.uid ?? '';
      // Mapa de otro duelo, duelo acabado o sin intentos: a su pantalla, sin gastar nada
      if (!duel || duel.mapId !== map.id || !canRaceDuel(duel, uid, Date.now())) {
        void this.router.navigate(['/duels', code]);
        return;
      }
      if (!(await this.duels.startAttempt(code).catch(() => false))) {
        void this.router.navigate(['/duels', code]);
        return;
      }
      this.duelCode = code;
      this.boardId = duelBoardId(code);
    }
    const track = trackOf(map);
    this.renderer.attach(
      this.scene().nativeElement,
      track,
      map.theme,
      this.garage.choice(),
      map.terrain,
    );
    this.controls.attach(this.surface().nativeElement as HTMLElement);
    // Los carteles se rellenan cuando llegan los datos, sin hacer esperar a la carrera
    void this.loadBillboards();
    this.audio.setVolumes(this.settings.getVolumes());
    // Rival elegido antes de correr: en el mapa del día y en el torneo, del ranking de ese día
    const pick = this.ranking.picked(this.boardId);
    this.session = new RaceSession(map, track, {
      renderer: this.renderer,
      input: this.controls,
      loop: this.loop,
      bestRuns: this.bestRuns,
      audio: this.audio,
      records: this.isDaily()
        ? { publish: (run) => void (this.publishing = this.publishSpecial(run)) }
        : this.cloudRecords,
    }, this.boardId);
    if (pick?.ranked) await this.useRival(pick.ranked);
    if (this.duelCode) await this.useDuelRival(this.duelCode);
    if (showTutorialBeforeRace(this.settings.getTutorialSeen())) {
      await new Promise<void>((resolve) => {
        this.tutorialClosed = resolve;
        this.tutorialOpen.set(true);
      });
    }
    // Cubo azul del mapa del día: en su carril hasta que se coja (una vez al día)
    const key = this.dailyKey;
    if (key && this.garage.cubeAvailable(key)) {
      this.session.useCube(dailyCube(key, track.circuit?.lapTrack ?? track), () => {
        const locked = this.garage.lockedPrizes();
        const prize = this.garage.claimCube(key);
        if (prize) this.won.set({ prize, reel: prizeReel(prize, locked) });
      });
    }
    await this.session.start(
      (s) => this.onState(s),
      () => this.quickRestart(),
    );
  }

  /**
   * Récord del día o del torneo: se sube a su ranking y, si además mejora mi récord del mapa,
   * también cuenta para el ranking normal.
   */
  private async publishSpecial(run: BestRun): Promise<void> {
    await this.cloudRecords.publish(run);
    const map = this.map();
    if (!map) return;
    const best = await this.bestRuns.get(map.id);
    if (best && best.time <= run.time) return;
    const mapRun: BestRun = { ...run, mapId: map.id };
    await this.bestRuns.save(mapRun);
    await this.cloudRecords.publish(mapRun);
  }

  /** Ranking del día del torneo si puedo correrlo ahora en este mapa; si no, null. */
  private async tournamentBoard(code: string, mapId: string): Promise<string | null> {
    const uid = this.account.profile()?.uid;
    const t = await this.tournaments.find(code).catch(() => null);
    if (!t || !uid || !isMember(t, uid)) return null;
    const now = Date.now();
    const day = dayIndex(t, now);
    if (statusAt(t, now) !== 'running' || day === null || t.mapIds[day] !== mapId) return null;
    this.tournament = t;
    return dayBoardId(t.code, day);
  }

  /** Líder y segundo del torneo o del ranking de esta carrera; sin red, sin carteles. */
  private async loadBillboards(): Promise<void> {
    // En un 1 vs 1 no hay líderes que anunciar: son solo dos pilotos
    if (this.duelCode) return;
    try {
      if (this.tournament) {
        const t = this.tournament;
        // Con lo que ya trajo la pantalla del torneo, los carteles salen desde el semáforo
        const cached = this.tournaments.cachedBoard(t.code);
        if (cached) await this.showTournamentBoard(t, cached, true);
        await this.showTournamentBoard(t, await this.tournaments.board(t), false);
      } else {
        const view = await this.ranking.load(this.boardId);
        // Sin red no se sabe quién va primero: mejor no poner carteles que decir algo falso
        if (view.total === null && !view.top.length) return;
        this.renderer.setBillboards(rankingBillboards(view, this.isDaily(), this.i18n));
      }
    } catch {
      // Los carteles son decoración: si falla la red, la carrera sigue igual
    }
  }

  /**
   * Carteles del torneo y el de la foto del líder (o su bandera si no ha puesto foto). Con
   * `cachedOnly` no espera a la red: usa la foto ya descargada (o la bandera mientras llega).
   */
  private async showTournamentBoard(t: Tournament, board: TournamentBoard, cachedOnly: boolean): Promise<void> {
    const content = tournamentBillboards(t, board.rows, this.i18n);
    this.renderer.setBillboards(content);
    const leader = leaderOf(board.rows);
    if (!leader || !content.leader) return;
    const cachedPhoto = this.tournaments.cachedPhoto(t.code, leader.member.uid);
    if (cachedPhoto !== undefined || cachedOnly) {
      this.renderer.setLeaderPhoto({ leader: content.leader, photo: cachedPhoto ?? null });
    }
    if (cachedOnly) return;
    const photo = await this.tournaments.photoOf(t.code, leader.member.uid);
    this.renderer.setLeaderPhoto({ leader: content.leader, photo });
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
    if (state.lap) {
      this.finishBanner.set(true);
      setTimeout(() => this.finishBanner.set(false), FINISH_BANNER_MS);
    }
    // En un 1 vs 1 no hay puesto mundial: los tiempos se ven en la pantalla del duelo
    if (this.duelCode) {
      void this.closeDuelRun();
      return;
    }
    // Puesto mundial con mi mejor tiempo (el nuevo si es récord)
    if (!this.account.profile()) return;
    const best = result.previousBest === null ? result.time : Math.min(result.time, result.previousBest);
    void this.ranking
      .standing(this.boardId, best)
      // En el mapa del día y en el torneo «Repetir» no cambia de rival
      .then((s) => this.standing.set(s && this.isDaily() ? { ...s, next: null } : s));
  }
}
