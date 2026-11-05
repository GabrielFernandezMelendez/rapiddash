import {
  Box3,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  Object3D,
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
} from '../../../core/domain/track/billboards';
import { MapTheme } from '../../../core/domain/track/race-map';
import { Track } from '../../../core/domain/track/track';
import { PhotoGantry } from './photo-gantry';
import { CubeMesh } from './cube-mesh';
import { DailyCube } from '../../../core/domain/daily/daily-cube';
import { applyTerrain } from './terrain-mesh';
import { buildTerrain, FLAT, Terrain, TerrainSpec } from '../../../core/domain/track/terrain';
import { buildGarageCar } from './garage/garage-cars';
import { GarageFx } from './garage/garage-fx';
import {
  CLASSIC_EXHAUST,
  DEFAULT_GARAGE,
  GarageChoice,
  garageCarFor,
} from '../../../core/domain/garage/garage';
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
  // Lejos (900 m) para ver los carteles lejanos con la foto del líder
  private camera = new PerspectiveCamera(CAMERA.fov, 9 / 19, 0.1, 900);
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
  private garageFx: GarageFx | null = null;
  private fxAnchor: Group | null = null;
  private fxId: number = CLASSIC_EXHAUST;
  /** Cubo azul del mapa del día (se crea al pedirlo). */
  private cube: CubeMesh | null = null;
  /** Relieve del circuito (llano en los mapas sin colinas). */
  private terrain: Terrain = FLAT;
  private cameraGround = Number.NaN;

  attach(
    host: HTMLElement,
    track: Track,
    theme: MapTheme,
    aesthetic: Aesthetic,
    garage: GarageChoice = DEFAULT_GARAGE,
    terrainSpec?: TerrainSpec,
  ): void {
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
    this.terrain = terrainSpec ? buildTerrain(drawn, terrainSpec) : FLAT;
    const circuit = !!track.circuit;
    if (isSynthwave(aesthetic)) this.buildSynthwave(drawn, theme, circuit);
    else this.buildClassic(drawn, theme, circuit);
    this.billboards = new LeaderBillboards(
      drawn,
      isSynthwave(aesthetic) ? SYNTH_BILLBOARD : CLASSIC_BILLBOARD,
    );
    this.scene.add(this.billboards.group);
    // Carteles con la foto del líder del torneo (borde LED solo en la estética futurista): cuatro,
    // enormes y lejos de la carretera, al fondo de las rectas más largas
    const photoStyle = isSynthwave(aesthetic) ? SYNTH_BILLBOARD : CLASSIC_BILLBOARD;
    // Con colinas: más lejos (en el llano), más grandes y más altos, por encima de las lomas
    const hills = terrainSpec !== undefined;
    this.photoGantries = distantPhotoSpots(drawn, 4, hills ? 120 : 0).map(
      (spot) =>
        new PhotoGantry(
          spot,
          photoStyle,
          aesthetic === 'futurist',
          hills ? { scale: 10, lift: this.terrain.maxRoad * 2 + 4 } : {},
        ),
    );
    for (const g of this.photoGantries) {
      g.group.userData['terrain'] = 'rigid';
      this.scene.add(g.group);
    }
    // Todo lo de hasta aquí (menos el cielo) se pone sobre el relieve
    if (hills) applyTerrain(this.scene, this.terrain);
    const vehicle = VEHICLES[aesthetic];
    // Coche del garaje (en retro y futurista); el fantasma sigue siendo el de la estética
    const garageCar = garageCarFor(garage, aesthetic);
    this.car = garageCar === null ? vehicle(false) : buildGarageCar(garageCar);
    this.ghost = vehicle(true);
    this.carBounce = new CarBounce();
    this.ghostBounce = new CarBounce();
    this.cameraLeg = -1;
    this.ghost.visible = false;
    this.scene.add(this.ghost, this.car);
    // Color del fantasma de cada estética (--rd-ghost)
    this.ghostLabel = new GhostLabel(isSynthwave(aesthetic) ? '#2de2e6' : '#8fd3ff');
    this.scene.add(this.ghostLabel.sprite);
    // Efecto al acelerar: el 1 es el escape de siempre; los demás siguen al coche desde fuera
    // (en un grupo que copia su posición y giro, no los botes ni el aplastado)
    this.fxId = garage.fx;
    if (garage.fx === CLASSIC_EXHAUST) {
      this.exhaust = new ExhaustFx(this.car, this.scene);
    } else {
      this.fxAnchor = new Group();
      this.scene.add(this.fxAnchor);
      const size = new Box3().setFromObject(this.car);
      this.garageFx = new GarageFx(this.fxAnchor, {
        rearZ: size.max.z,
        halfWidth: Math.min(size.max.x, 0.85),
        roofY: size.max.y,
        exhaustY: 0.32,
      });
    }
    this.scrape = new ScrapeFx(this.car, this.scene);
    this.cameraHeading = null;
    this.cameraGround = Number.NaN;

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
    // El cielo (sol y montañas) sigue a la cámara: no va sobre el relieve
    this.sky.group.userData['terrain'] = 'skip';
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
    this.onGround(this.car);
    this.ghost.visible = frame.ghost !== null;
    if (frame.ghost) {
      this.place(this.ghost, frame.ghost);
      this.ghostBounce.apply(this.ghost, dt, frame.ghost.leg, frame.ghost.lateral);
      this.onGround(this.ghost);
    }
    this.ghostLabel?.update(
      frame.ghost ? frame.ghostLabel : null,
      this.ghost.position.x,
      this.ghost.position.z,
    );
    if (this.ghostLabel) this.ghostLabel.sprite.position.y += this.ghost.position.y;
    this.exhaust?.update(dt, frame.car.accelerating);
    // Velocidad aproximada para la intensidad de las chispas
    const moved = dt > 0 ? Math.abs(frame.car.distance - this.lastDistance) / dt : 0;
    this.lastDistance = frame.car.distance;
    if (this.garageFx && this.fxAnchor) {
      this.fxAnchor.position.set(this.car.position.x, this.groundAt(this.car), this.car.position.z);
      this.fxAnchor.rotation.set(this.car.rotation.x, this.car.rotation.y, 0, 'YXZ');
      // Al cambiar de tramo la distancia vuelve a 0: ese fotograma no cuenta como velocidad
      this.garageFx.update(dt, frame.car.accelerating, this.fxId, Math.min(moved, 80));
    }
    this.scrape?.update(dt, frame.car.scrapeSide, Math.min(1, moved / 26));
    this.cube?.update(dt);
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
    // Con colinas, la cámara sube y baja con la carretera (suavizado, sin tirones)
    const ground = this.terrain.height(p.x, p.z);
    if (Number.isNaN(this.cameraGround)) this.cameraGround = ground;
    this.cameraGround += (ground - this.cameraGround) * Math.min(1, dt * 6);
    const aheadX = p.x + fx * CAMERA.lookAhead;
    const aheadZ = p.z + fz * CAMERA.lookAhead;
    this.camera.position.set(
      p.x - fx * CAMERA.back + jitter(),
      this.cameraGround + CAMERA.height + jitter(),
      p.z - fz * CAMERA.back,
    );
    this.camera.lookAt(aheadX, this.terrain.height(aheadX, aheadZ) + 0.6, aheadZ);
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

  showCube(cube: DailyCube | null): void {
    const track = this.track;
    if (!cube || !track) {
      this.cube?.hide();
      return;
    }
    if (!this.cube) {
      this.cube = new CubeMesh();
      this.scene.add(this.cube.group);
    }
    // En un circuito, el mismo sitio en cada vuelta: se busca en la vuelta dibujada
    const lap = track.circuit?.lapTrack ?? track;
    const leg =
      lap.legs.find((l) => cube.progress < l.startProgress + l.length) ?? lap.legs[lap.legs.length - 1];
    const p = lap.worldAt(leg.index, cube.progress - leg.startProgress, cube.lateral);
    this.cube.place(p.x, this.terrain.height(p.x, p.z), p.z, p.heading);
  }

  collectCube(): void {
    this.cube?.collect();
  }

  setLeaderPhoto(content: LeaderPhotoContent | null): void {
    for (const g of this.photoGantries) g.set(content);
  }

  dispose(): void {
    this.billboards = null;
    this.photoGantries = [];
    this.garageFx?.dispose();
    this.garageFx = null;
    this.fxAnchor = null;
    this.exhaust = null;
    this.cube = null;
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

  /**
   * Sube el coche a la altura del suelo y lo inclina con la pendiente (morro arriba al subir).
   * Va después de los botes, que ponen la altura del saltito.
   */
  private onGround(obj: Group): void {
    if (this.terrain === FLAT) return;
    const yaw = obj.rotation.y;
    // El morro mira a -Z local: hacia delante en el mundo es (-sin, -cos)
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const x = obj.position.x;
    const z = obj.position.z;
    const front = this.terrain.height(x + fx * 1.2, z + fz * 1.2);
    const back = this.terrain.height(x - fx * 1.2, z - fz * 1.2);
    obj.position.y += (front + back) / 2;
    obj.rotation.order = 'YXZ';
    obj.rotation.x = Math.atan2(front - back, 2.4);
  }

  private groundAt(obj: Object3D): number {
    return this.terrain.height(obj.position.x, obj.position.z);
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
