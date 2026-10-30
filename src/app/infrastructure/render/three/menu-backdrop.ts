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
} from 'three';
import { MenuBackdropPort } from '../../../core/application/ports/out/menu-backdrop.port';
import { Aesthetic } from '../../../core/domain/settings/aesthetic';
import { LANE_WIDTH } from '../../../core/domain/track/track-constants';
import { straight } from '../../../core/domain/track/track-segment';
import { Track } from '../../../core/domain/track/track';
import { SYNTH_PALETTES } from './synthwave/synth-palettes';
import { buildSynthScenery, skyTexture, SynthSky } from './synthwave/synth-world';
import { buildRetroCar, buildShip } from './synthwave/vehicles';
import { buildTrackMesh } from './track-mesh';

const ROAD_LENGTH = 900;
const SPEED = 12;

/**
 * Escena del menú: la misma pista, cielo y vehículo synthwave del juego, en una recta larga.
 * El vehículo avanza hacia el sol y cambia de carril de vez en cuando con el rebote del juego.
 */
export class ThreeMenuBackdrop extends MenuBackdropPort {
  private renderer: WebGLRenderer | null = null;
  private scene = new Scene();
  private readonly camera = new PerspectiveCamera(56, 9 / 19, 0.1, 600);
  private car: Group | null = null;
  private sky: SynthSky | null = null;
  private track: Track | null = null;
  private host: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private frame = 0;
  private last = 0;
  private distance = 30;
  private lane = 0;
  private laneTarget = 0;
  private laneVelocity = 0;
  private nextSwap = 2.5;

  async attach(host: HTMLElement, aesthetic: Aesthetic): Promise<void> {
    this.dispose();
    this.host = host;
    const palette = SYNTH_PALETTES.bay;
    const track = Track.fromSegments([straight(ROAD_LENGTH)]);
    this.track = track;

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const canvas = this.renderer.domElement;
    canvas.style.cssText = 'display:block;width:100%;height:100%;opacity:0;transition:opacity .6s';
    host.appendChild(canvas);

    this.scene = new Scene();
    this.scene.background = skyTexture(palette);
    this.scene.fog = new Fog(palette.sky, palette.fogNear, palette.fogFar);
    this.scene.add(new HemisphereLight(0xcfb8ff, 0x2a0a4f, 0.9 * Math.PI));
    const key = new DirectionalLight(0xff8acb, 0.8 * Math.PI);
    key.position.set(-4, 10, -12);
    const rim = new DirectionalLight(0x2de2e6, 0.5 * Math.PI);
    rim.position.set(6, 4, 10);
    this.sky = new SynthSky(palette);
    this.scene.add(key, rim, this.sky.group);
    this.scene.add(buildSynthScenery(track, palette), buildTrackMesh(track, palette));
    this.car = aesthetic === 'futurist' ? buildShip() : buildRetroCar();
    this.scene.add(this.car);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.tick);
    // Aparece suave una vez dibujado el primer fotograma
    requestAnimationFrame(() => (canvas.style.opacity = '1'));
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.frame = requestAnimationFrame(this.tick);
  };

  private step(dt: number): void {
    const track = this.track;
    const car = this.car;
    if (!track || !car || !this.renderer) return;
    this.distance += SPEED * dt;
    if (this.distance > ROAD_LENGTH - 260) this.distance = 30;

    // Cambio de carril con el mismo muelle que el juego
    this.nextSwap -= dt;
    if (this.nextSwap <= 0) {
      const options = [-LANE_WIDTH, 0, LANE_WIDTH].filter((x) => x !== this.laneTarget);
      this.laneTarget = options[Math.floor(this.distance) % options.length];
      this.nextSwap = 3;
    }
    const w = 13;
    this.laneVelocity +=
      (w * w * (this.laneTarget - this.lane) - 2 * 0.5 * w * this.laneVelocity) * dt;
    this.lane += this.laneVelocity * dt;

    const p = track.worldAt(0, this.distance, this.lane);
    car.position.set(p.x, 0, p.z);
    car.rotation.set(0, -this.laneVelocity * 0.03, this.laneVelocity * 0.025);
    // Cámara baja y algo apartada: el coche queda abajo y el sol, detrás del logo
    const c = track.worldAt(0, this.distance - 9, 1.2);
    this.camera.position.set(c.x, 2.6, c.z);
    const look = track.worldAt(0, this.distance + 30, -0.4);
    this.camera.lookAt(look.x, 4.2, look.z);
    this.sky?.follow(c.x, c.z);
    this.renderer.render(this.scene, this.camera);
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

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.scene.traverse((obj) => {
      if (obj instanceof Mesh || obj instanceof Sprite) {
        obj.geometry?.dispose();
        const materials: Material[] = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of materials) {
          (m as Material & { map?: Texture | null }).map?.dispose();
          m.dispose();
        }
      }
    });
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
    this.renderer = null;
    this.car = null;
    this.sky = null;
    this.track = null;
    this.host = null;
  }
}
