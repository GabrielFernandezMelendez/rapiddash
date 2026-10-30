import { BestRun, GhostPlayback, GhostRecorder } from '../../domain/race/ghost';
import { PHYSICS_VERSION } from '../../domain/race/physics-version';
import {
  CountdownLight,
  createRace,
  lightOf,
  RacePhase,
  RaceState,
  showsGo,
  stepRace,
} from '../../domain/race/race';
import { CAR_TUNING } from '../../domain/car/car-tuning';
import { Aesthetic } from '../../domain/settings/aesthetic';
import { RaceMap } from '../../domain/track/race-map';
import { Track } from '../../domain/track/track';
import { AudioPort } from '../ports/out/audio.port';
import { BestRunRepository } from '../ports/out/best-run.repository';
import { GameLoopPort } from '../ports/out/game-loop.port';
import { InputPort } from '../ports/out/input.port';
import { RendererPort } from '../ports/out/renderer.port';

/** Segundos que se muestra el aviso de choque. */
const CRASH_FLASH_TIME = 0.7;

export interface RaceResult {
  readonly time: number;
  readonly previousBest: number | null;
  readonly isRecord: boolean;
}

/** Lo que la UI necesita para pintar HUD, semáforo y resultados. */
export interface RaceViewState {
  readonly phase: RacePhase;
  readonly light: CountdownLight;
  readonly showGo: boolean;
  readonly time: number;
  readonly speed: number;
  readonly accelerating: boolean;
  /** Destello de "¡Choque!" durante un instante tras cada choque. */
  readonly crashFlash: boolean;
  readonly bestTime: number | null;
  /** Segundos respecto al fantasma: negativo = vas por delante. */
  readonly ghostDelta: number | null;
  readonly result: RaceResult | null;
}

/** Quien recibe cada récord nuevo para publicarlo (el ranking online). */
export interface RecordSink {
  publish(run: BestRun): void;
}

export interface RaceSessionPorts {
  readonly renderer: RendererPort;
  readonly input: InputPort;
  readonly loop: GameLoopPort;
  readonly bestRuns: BestRunRepository;
  readonly audio: AudioPort;
  readonly records?: RecordSink;
}

/**
 * Caso de uso "jugar una carrera": une el dominio con los puertos.
 * En cada fotograma lee controles, avanza la simulación, graba el fantasma y dibuja.
 */
export class RaceSession {
  private race!: RaceState;
  private recorder = new GhostRecorder();
  private ghost: GhostPlayback | null = null;
  private best: BestRun | null = null;
  private result: RaceResult | null = null;
  private lastCrashAt = -Infinity;
  private listener: (state: RaceViewState) => void = () => {};

  constructor(
    private readonly map: RaceMap,
    private readonly track: Track,
    private readonly ports: RaceSessionPorts,
    /** Estética: elige la música y el motor (nunca cambia la física). */
    private readonly aesthetic: Aesthetic = 'classic',
  ) {}

  async start(listener: (state: RaceViewState) => void): Promise<void> {
    this.listener = listener;
    this.best = await this.ports.bestRuns.get(this.map.id);
    this.reset();
    this.ports.audio.start(this.aesthetic);
    this.ports.loop.start((dt) => this.tick(dt));
  }

  restart(): void {
    this.reset();
    this.ports.audio.nextSong();
  }

  stop(): void {
    this.ports.loop.stop();
  }

  private reset(): void {
    this.race = createRace(this.track);
    this.recorder = new GhostRecorder();
    this.ghost = this.best ? new GhostPlayback(this.best.frames) : null;
    this.result = null;
    this.lastCrashAt = -Infinity;
    this.ports.input.read(); // descarta swipes pendientes
  }

  private tick(dt: number): void {
    const input = this.ports.input.read();
    const { race, events } = stepRace(this.race, input, this.track, dt);
    this.race = race;
    const car = race.car;
    const progress = this.track.progress(car.leg, car.distance);

    if (race.phase === 'racing') this.recorder.record(race.raceTime, progress, car);
    if (events.includes('crash')) {
      this.ports.renderer.impact();
      this.lastCrashAt = race.raceTime;
    }
    if (events.includes('bump')) this.ports.renderer.bump(car.lateral > 0 ? 1 : -1);
    if (events.includes('finish')) void this.finish();

    this.ports.renderer.render(
      {
        car: {
          leg: car.leg,
          distance: car.distance,
          lateral: car.lateral,
          yaw: car.yaw,
          accelerating: car.accelerating,
          recovering: car.mode === 'recovering',
          scrapeSide: car.scrapeSide,
        },
        // En la cuenta atrás el fantasma espera en la salida
        ghost: this.ghost?.poseAt(race.phase === 'countdown' ? 0 : race.raceTime) ?? null,
      },
      dt,
    );

    this.ports.audio.update({
      phase: race.phase,
      accelerating: car.accelerating,
      speedRatio: car.speed / CAR_TUNING.maxSpeed,
    });
    this.listener(this.viewState());
  }

  private async finish(): Promise<void> {
    const time = this.race.raceTime;
    const previousBest = this.best?.time ?? null;
    const isRecord = previousBest === null || time < previousBest;
    this.result = { time, previousBest, isRecord };
    if (isRecord) {
      const run: BestRun = {
        mapId: this.map.id,
        time,
        frames: this.recorder.finish(
          time,
          this.track.progress(this.race.car.leg, this.race.car.distance),
          this.race.car,
        ),
        recordedAt: new Date().toISOString(),
        physicsVersion: PHYSICS_VERSION,
      };
      this.best = run;
      await this.ports.bestRuns.save(run);
      this.ports.records?.publish(run);
    }
  }

  private viewState(): RaceViewState {
    const race = this.race;
    let ghostDelta: number | null = null;
    if (this.ghost && race.phase === 'racing') {
      const ghostTime = this.ghost.timeAtProgress(
        this.track.progress(race.car.leg, race.car.distance),
      );
      if (ghostTime !== null) ghostDelta = race.raceTime - ghostTime;
    }
    return {
      phase: race.phase,
      light: lightOf(race),
      showGo: showsGo(race),
      time: race.raceTime,
      speed: race.car.speed,
      accelerating: race.car.accelerating,
      crashFlash: race.raceTime - this.lastCrashAt < CRASH_FLASH_TIME,
      bestTime: this.result?.previousBest ?? this.best?.time ?? null,
      ghostDelta,
      result: this.result,
    };
  }
}
