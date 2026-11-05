import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Clock,
  Color,
  CylinderGeometry,
  DirectionalLight,
  FogExp2,
  GridHelper,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  TorusGeometry,
  WebGLRenderer,
} from 'three';
import { GarageScenePort } from '../../../../core/application/ports/out/garage-scene.port';
import { buildRetroCar } from '../synthwave/vehicles';
import { buildGarageCar } from './garage-cars';
import { GarageFx } from './garage-fx';


/** El escape de los vehículos sale a esta altura (los del garaje y los de serie). */
const EXHAUST_Y = 0.32;

/**
 * Showroom del garaje: plataforma con aros de neón, barras de luz al fondo y el coche girando.
 * Acelerando sale el efecto elegido (con la marcha simulada, porque el coche no avanza).
 */
export class GarageSceneAdapter extends GarageScenePort {
  private host: HTMLElement | null = null;
  private renderer: WebGLRenderer | null = null;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(38, 1, 0.1, 200);
  private readonly turntable = new Group();
  private fx: GarageFx | null = null;
  private fxId = 1;
  private accelerating = false;
  private readonly clock = new Clock();
  private frame = 0;
  private resizeObserver: ResizeObserver | null = null;

  attach(host: HTMLElement): void {
    this.dispose();
    this.host = host;
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    host.appendChild(this.renderer.domElement);
    this.buildStage();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.clock.start();
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  }

  show(car: number | null): void {
    this.fx?.dispose();
    this.turntable.clear();
    const model = car === null ? buildRetroCar() : buildGarageCar(car);
    // Puntos de salida de los efectos según el tamaño del coche (antes de girarlo)
    const size = new Box3().setFromObject(model);
    this.fx = new GarageFx(model, {
      rearZ: size.max.z,
      halfWidth: Math.min(size.max.x, 0.85),
      roofY: size.max.y,
      exhaustY: EXHAUST_Y,
    });
    this.turntable.add(model);
  }

  setFx(fx: number): void {
    this.fxId = fx;
  }

  setAccelerating(on: boolean): void {
    this.accelerating = on;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.fx?.dispose();
    this.fx = null;
    this.turntable.clear();
    this.scene.clear();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.renderer = null;
    this.host = null;
  }

  private tick(): void {
    const renderer = this.renderer;
    if (!renderer) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    // Acelerando gira más despacio para ver bien la estela
    this.turntable.rotation.y += dt * (this.accelerating ? 0.2 : 0.45);
    this.fx?.update(dt, this.accelerating, this.fxId);
    renderer.render(this.scene, this.camera);
  }

  private resize(): void {
    const host = this.host;
    if (!host || !this.renderer) return;
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // En vertical hace falta más campo para que quepa el coche entero al girar
    this.camera.fov = w / h < 1 ? 40 : 34;
    this.camera.position.set(3.8, 2.3, -5.0);
    this.camera.lookAt(0, 0.35, 0.5);
    this.camera.updateProjectionMatrix();
  }

  private buildStage(): void {
    const scene = this.scene;
    scene.background = new Color(0x0b0714);
    scene.fog = new FogExp2(0x0b0714, 0.028);
    scene.add(new AmbientLight(0xffffff, 1.2));
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 10, -5);
    scene.add(sun);

    const grid = new GridHelper(30, 30, 0x2a1f45, 0x1a1230);
    grid.position.y = -0.12;
    scene.add(grid);
    const platform = new Mesh(
      new CylinderGeometry(2.05, 2.2, 0.12, 64),
      new MeshBasicMaterial({ color: 0x14101f }),
    );
    platform.position.y = -0.06;
    scene.add(platform);
    for (const [radius, tube, color] of [
      [2.03, 0.015, 0x2de2e6],
      [2.19, 0.01, 0xff4fd8],
    ] as const) {
      const ring = new Mesh(
        new TorusGeometry(radius, tube, 8, 96),
        new MeshBasicMaterial({ color }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);
    }
    // Fondo: barras verticales de neón y un halo, como un cartel de los 80
    const barColors = [0xff4fd8, 0x2de2e6, 0xff4fd8, 0xffd319, 0x2de2e6, 0xff4fd8, 0x2de2e6];
    barColors.forEach((color, i) => {
      const bar = new Mesh(new BoxGeometry(0.04, 3.4, 0.04), new MeshBasicMaterial({ color }));
      bar.position.set(-3.6 + i * 1.2, 1.65, 4.8);
      scene.add(bar);
    });
    const halo = new Mesh(
      new TorusGeometry(2.2, 0.02, 8, 96),
      new MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.5 }),
    );
    halo.position.set(0, 2.2, 5.2);
    scene.add(halo);
    scene.add(this.turntable);
  }
}
