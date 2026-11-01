import {
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  PerspectiveCamera,
  Scene,
  Sprite,
  Texture,
  WebGLRenderer,
  Color,
} from 'three';
import { RenderFrame, RendererPort } from '../../../core/application/ports/out/renderer.port';
import { CarPose } from '../../../core/domain/race/ghost';
import { Aesthetic, isSynthwave } from '../../../core/domain/settings/aesthetic';
import {
  BillboardContent,
  distantPhotoSpots,
  LeaderPhotoContent,
  photoSpots,
} from '../../../core/domain/track/billboards';
import { MapTheme } from '../../../core/domain/track/race-map';
import { Track } from '../../../core/domain/track/track';
import { PhotoGantry } from './photo-gantry';
import { CLASSIC_BILLBOARD, LeaderBillboards, SYNTH_BILLBOARD } from './billboards';
import { buildCar, CarBounce, ExhaustFx, ScrapeFx } from './car-mesh';
import { GhostLabel } from './ghost-label';
import { buildScenery } from './scenery';
import { PALETTES } from './themes';
import { SYNTH_PALETTES } from './synthwave/synth-palettes';
import { buildSynthScenery, skyTexture, SynthSky } from './synthwave/synth-world';
import { buildRetroCar, buildShip } from './synthwave/vehicles';
import { buildTrackMesh } from './track-mesh';

/** Vehículo de cada estética (el fantasma usa la misma forma, translúcida). */
const VEHICLES: Record<Aesthetic, (ghost: boolean) => Group> = {
  classic: buildCar,
  retro: buildRetroCar,
  futurist: buildShip,
};

// Cámara estilo Subway Surfers, algo alejada para leer la carretera con antelación
const CAMERA = {
  fov: 74,
  back: 12.5,
  height: 9.2,
  lookAhead: 11,
  follow: 4.5,
  /** Retraso lateral de la cámara en los cambios de carril (más alto = menos retraso). */
  lateralFollow: 7,
  /** En los cruces la cámara alcanza al coche enseguida para no dar un salto al salir. */
  junctionFollow: 25,
} as const;

export class ThreeRendererAdapter extends RendererPort {
  private renderer: WebGLRenderer | null = null;
  private scene = new Scene();
  private camera = new PerspectiveCamera(CAMERA.fov, 9 / 19, 0.1, 500);
  private track: Track | null = null;
  private car = buildCar();
  private ghost = buildCar(true);
  private exhaust: ExhaustFx | null = null;
  private scrape: ScrapeFx | null = null;
  private carBounce = new CarBounce();
  private ghostBounce = new CarBounce();
  private ghostLabel: GhostLabel | null = null;
  private lastDistance = 0;
  private resizeObserver: ResizeObserver | null = null;
  private host: HTMLElement | null = null;
  private cameraHeading: number | null = null;
  private shake = 0;
  /** Lateral que sigue la cámara: va con algo de retraso para que el coche se vea moverse. */
  private cameraLateral = 0;
  private cameraLeg = -1;
  /** Sol y montañas synthwave: siguen a la cámara (null en la estética clásica). */
  private sky: SynthSky | null = null;
  private billboards: LeaderBillboards | null = null;
  private photoGantries: PhotoGantry[] = [];

  attach(host: HTMLElement, track: Track, theme: MapTheme, aesthetic: Aesthetic): void {
    this.dispose();
    this.host = host;
    this.track = track;

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    host.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    // En un circuito se dibuja una sola vuelta: las demás pasan por los mismos sitios
    const drawn = track.circuit?.lapTrack ?? track;
    const circuit = !!track.circuit;
    if (isSynthwave(aesthetic)) this.buildSynthwave(drawn, theme, circuit);
    else this.buildClassic(drawn, theme, circuit);
    this.billboards = new LeaderBillboards(drawn, isSynthwave(aesthetic) ? SYNTH_BILLBOARD : CLASSIC_BILLBOARD);
    this.scene.add(this.billboards.group);
    // Carteles con la foto del líder del torneo (borde LED solo en la estética futurista): dos
    // sobre la carretera, donde más tiempo los ve la cámara (en un circuito, mirando también el
    // final de la vuelta), y dos lejanos, grandes, al fondo de las rectas más largas
    const overRoad = photoSpots(drawn, circuit).map((spot) => ({
      ...drawn.pointAt(spot.leg, spot.distance),
      roadHalf: drawn.halfWidthAt(spot.leg, spot.distance),
    }));
    const distant = distantPhotoSpots(drawn, overRoad).map((spot) => ({ ...spot, roadHalf: null }));
    const photoStyle = isSynthwave(aesthetic) ? SYNTH_BILLBOARD : CLASSIC_BILLBOARD;
    this.photoGantries = [...overRoad, ...distant].map(
      (place) => new PhotoGantry(place, photoStyle, aesthetic === 'futurist'),
    );
    for (const g of this.photoGantries) this.scene.add(g.group);
    const vehicle = VEHICLES[aesthetic];
    this.car = vehicle(false);
    this.ghost = vehicle(true);
    this.carBounce = new CarBounce();
    this.ghostBounce = new CarBounce();
    this.cameraLeg = -1;
    this.ghost.visible = false;
    this.scene.add(this.ghost, this.car);
    // Color del fantasma de cada estética (--rd-ghost)
    this.ghostLabel = new GhostLabel(isSynthwave(aesthetic) ? '#2de2e6' : '#8fd3ff');
    this.scene.add(this.ghostLabel.sprite);
    this.exhaust = new ExhaustFx(this.car, this.scene);
    this.scrape = new ScrapeFx(this.car, this.scene);
    this.cameraHeading = null;

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  /** Estética clásica: cielo claro, árboles y muros de franjas. */
  private buildClassic(track: Track, theme: MapTheme, circuit: boolean): void {
    const palette = PALETTES[theme];
    this.sky = null;
    this.scene.background = new Color(palette.sky);
    this.scene.fog = new Fog(palette.sky, palette.fogNear, palette.fogFar);
    this.scene.add(new HemisphereLight(0xffffff, palette.ground, 0.65 * Math.PI));
    const sun = new DirectionalLight(0xffffff, 0.75 * Math.PI);
    sun.position.set(-30, 50, 20);
    this.scene.add(sun);
    this.scene.add(buildScenery(track, palette), buildTrackMesh(track, palette, circuit));
  }

  /** Estéticas retro y futurista: noche synthwave con sol a franjas, rejilla y neón. */
  private buildSynthwave(track: Track, theme: MapTheme, circuit: boolean): void {
    const palette = SYNTH_PALETTES[theme];
    this.scene.background = skyTexture(palette);
    this.scene.fog = new Fog(palette.sky, palette.fogNear, palette.fogFar);
    this.scene.add(new HemisphereLight(0xcfb8ff, 0x2a0a4f, 0.9 * Math.PI));
    const key = new DirectionalLight(0xff8acb, 0.8 * Math.PI);
    key.position.set(-4, 10, -12);
    const rim = new DirectionalLight(0x2de2e6, 0.5 * Math.PI);
    rim.position.set(6, 4, 10);
    this.scene.add(key, rim);
    this.sky = new SynthSky(palette);
    this.scene.add(
      this.sky.group,
      buildSynthScenery(track, palette),
      buildTrackMesh(track, palette, circuit),
    );
  }

  render(frame: RenderFrame, dt: number): void {
    const track = this.track;
    const renderer = this.renderer;
    if (!track || !renderer) return;

    this.place(this.car, frame.car);
    for (const g of this.photoGantries) g.update(dt);
    this.carBounce.apply(this.car, dt, frame.car.leg, frame.car.lateral);
    this.ghost.visible = frame.ghost !== null;
    if (frame.ghost) {
      this.place(this.ghost, frame.ghost);
      this.ghostBounce.apply(this.ghost, dt, frame.ghost.leg, frame.ghost.lateral);
    }
    this.ghostLabel?.update(
      frame.ghost ? frame.ghostLabel : null,
      this.ghost.position.x,
      this.ghost.position.z,
    );
    this.exhaust?.update(dt, frame.car.accelerating);
    // Velocidad aproximada para la intensidad de las chispas
    const moved = dt > 0 ? Math.abs(frame.car.distance - this.lastDistance) / dt : 0;
    this.lastDistance = frame.car.distance;
    this.scrape?.update(dt, frame.car.scrapeSide, Math.min(1, moved / 26));
    // El roce hace vibrar la cámara un poco, mucho menos que un choque
    if (frame.car.scrapeSide !== 0) this.shake = Math.max(this.shake, 0.12);

    // La cámara sigue el rumbo del tramo (no el morro), suavizado: al salir de un cruce gira 90°
    // La cámara sigue al coche de lado con algo de retraso (como Subway Surfers): en un cambio
    // de carril el coche se desplaza en pantalla y la cámara lo alcanza después
    if (frame.car.leg !== this.cameraLeg) {
      this.cameraLeg = frame.car.leg;
      this.cameraLateral = frame.car.lateral;
    }
    const inJunction = frame.car.distance > track.legs[frame.car.leg].length;
    const lateralRate = inJunction ? CAMERA.junctionFollow : CAMERA.lateralFollow;
    this.cameraLateral += (frame.car.lateral - this.cameraLateral) * Math.min(1, dt * lateralRate);
    const p = track.worldAt(frame.car.leg, frame.car.distance, this.cameraLateral);
    const target = p.heading;
    this.cameraHeading ??= target;
    this.cameraHeading += (target - this.cameraHeading) * Math.min(1, dt * CAMERA.follow);
    const fx = Math.sin(this.cameraHeading);
    const fz = -Math.cos(this.cameraHeading);
    this.shake = Math.max(0, this.shake - dt);
    const jitter = () => (Math.random() - 0.5) * this.shake;
    this.camera.position.set(
      p.x - fx * CAMERA.back + jitter(),
      CAMERA.height + jitter(),
      p.z - fz * CAMERA.back,
    );
    this.camera.lookAt(p.x + fx * CAMERA.lookAhead, 0.6, p.z + fz * CAMERA.lookAhead);
    this.sky?.follow(this.camera.position.x, this.camera.position.z);

    renderer.render(this.scene, this.camera);
  }

  impact(): void {
    this.shake = 0.5;
  }

  bump(side: 1 | -1): void {
    this.shake = Math.max(this.shake, 0.25);
    this.scrape?.burst(side, 14);
  }

  setBillboards(content: BillboardContent | null): void {
    this.billboards?.set(content);
  }

  setLeaderPhoto(content: LeaderPhotoContent | null): void {
    for (const g of this.photoGantries) g.set(content);
  }

  dispose(): void {
    this.billboards = null;
    this.photoGantries = [];
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.scene.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof Sprite) {
        obj.geometry?.dispose();
        const materials: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of materials) {
          const map = (m as Material & { map?: Texture | null }).map;
          map?.dispose();
          m.dispose();
        }
      }
    });
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.renderer = null;
    this.track = null;
    this.host = null;
  }

  private place(obj: Group, pose: CarPose): void {
    const track = this.track;
    if (!track) return;
    const p = track.worldAt(pose.leg, pose.distance, pose.lateral);
    obj.position.set(p.x, 0, p.z);
    obj.rotation.y = -(p.heading + pose.yaw);
  }

  private resize(): void {
    const host = this.host;
    if (!host || !this.renderer) return;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
