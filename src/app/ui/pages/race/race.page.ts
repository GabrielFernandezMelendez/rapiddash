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
import { BestRunRepository } from '../../../core/application/ports/out/best-run.repository';
import { GameLoopPort } from '../../../core/application/ports/out/game-loop.port';
import { InputPort } from '../../../core/application/ports/out/input.port';
import { RendererPort } from '../../../core/application/ports/out/renderer.port';
import { RaceSession, RaceViewState } from '../../../core/application/use-cases/race-session';
import { findMap } from '../../../core/domain/track/race-map';
import { Track } from '../../../core/domain/track/track';
import { provideRaceAdapters } from '../../../infrastructure/di/race.providers';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { Countdown } from '../../organisms/countdown/countdown';
import { Hud } from '../../organisms/hud/hud';
import { ResultsPanel } from '../../organisms/results-panel/results-panel';
import { RaceLayout } from '../../templates/race-layout/race-layout';

@Component({
  selector: 'rd-race-page',
  imports: [RaceLayout, Hud, Countdown, ResultsPanel],
  providers: [provideRaceAdapters()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-race-layout #surface>
      <div race-scene #scene class="scene"></div>
      @if (state(); as s) {
        <rd-hud [state]="s" [mapName]="mapName()" (exit)="exit()" />
        <rd-countdown [phase]="s.phase" [light]="s.light" [showGo]="s.showGo" />
        @if (s.result; as result) {
          <rd-results-panel [result]="result" (retry)="session?.restart()" (maps)="exit()" />
        }
      }
    </rd-race-layout>
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
  private readonly renderer = inject(RendererPort);
  private readonly controls = inject(InputPort);
  private readonly loop = inject(GameLoopPort);
  private readonly bestRuns = inject(BestRunRepository);

  private readonly scene = viewChild.required<ElementRef<HTMLElement>>('scene');
  private readonly surface = viewChild.required(RaceLayout, { read: ElementRef<HTMLElement> });

  protected readonly state = signal<RaceViewState | null>(null);
  protected readonly map = computed(() => findMap(this.mapId()));
  protected readonly mapName = computed(() => {
    const map = this.map();
    return map ? this.i18n.t(map.nameKey) : '';
  });
  protected session: RaceSession | null = null;

  constructor() {
    // El lienzo necesita el DOM real: arrancamos tras el primer render
    afterNextRender(() => void this.boot());
    inject(DestroyRef).onDestroy(() => {
      this.session?.stop();
      this.controls.dispose();
      this.renderer.dispose();
    });
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
    this.renderer.attach(this.scene().nativeElement, track, map.theme);
    this.controls.attach(this.surface().nativeElement as HTMLElement);
    this.session = new RaceSession(map, track, {
      renderer: this.renderer,
      input: this.controls,
      loop: this.loop,
      bestRuns: this.bestRuns,
    });
    await this.session.start((s) => this.state.set(s));
  }
}
