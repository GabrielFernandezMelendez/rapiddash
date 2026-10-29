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
import { MapTheme } from '../../../core/domain/track/race-map';
import { Track } from '../../../core/domain/track/track';
import { buildCar, ExhaustFx } from './car-mesh';
import { buildScenery } from './scenery';
import { PALETTES } from './themes';
import { buildTrackMesh } from './track-mesh';

// Cámara estilo Subway Surfers, algo alejada para leer la carretera con antelación
const CAMERA = { fov: 74, back: 12.5, height: 9.2, lookAhead: 11, follow: 4.5 } as const;

export class ThreeRendererAdapter extends RendererPort {
  private renderer: WebGLRenderer | null = null;
  private scene = new Scene();
  private camera = new PerspectiveCamera(CAMERA.fov, 9 / 19, 0.1, 500);
  private track: Track | null = null;
  private car = buildCar();
  private ghost = buildCar(true);
  private exhaust: ExhaustFx | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private host: HTMLElement | null = null;
  private cameraHeading: number | null = null;
  private shake = 0;

  attach(host: HTMLElement, track: Track, theme: MapTheme): void {
    this.dispose();
    this.host = host;
    this.track = track;
    const palette = PALETTES[theme];

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    host.appendChild(this.renderer.domElement);

    this.scene = new Scene();
    this.scene.background = new Color(palette.sky);
    this.scene.fog = new Fog(palette.sky, palette.fogNear, palette.fogFar);
    this.scene.add(new HemisphereLight(0xffffff, palette.ground, 0.65 * Math.PI));
    const sun = new DirectionalLight(0xffffff, 0.75 * Math.PI);
    sun.position.set(-30, 50, 20);
    this.scene.add(sun);

    this.scene.add(buildScenery(track, palette), buildTrackMesh(track, palette));
    this.car = buildCar();
    this.ghost = buildCar(true);
    this.ghost.visible = false;
    this.scene.add(this.ghost, this.car);
    this.exhaust = new ExhaustFx(this.car, this.scene);
    this.cameraHeading = null;

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
  }

  render(frame: RenderFrame, dt: number): void {
    const track = this.track;
    const renderer = this.renderer;
    if (!track || !renderer) return;

    this.place(this.car, frame.car);
    this.ghost.visible = frame.ghost !== null;
    if (frame.ghost) this.place(this.ghost, frame.ghost);
    this.exhaust?.update(dt, frame.car.accelerating);

    // La cámara sigue el rumbo del tramo (no el morro), suavizado: al salir de un cruce gira 90°
    const p = track.worldAt(frame.car.leg, frame.car.distance, frame.car.lateral);
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

    renderer.render(this.scene, this.camera);
  }

  impact(): void {
    this.shake = 0.5;
  }

  dispose(): void {
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
