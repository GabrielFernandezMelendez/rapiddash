import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { buildMockupCar } from '../../../infrastructure/render/three/mockup-vehicles';
import { MOCKUP_FX, MockupExhaustFx } from '../../../infrastructure/render/three/mockup-fx';

declare global {
  interface Window {
    /** Marca que el primer fotograma ya se ha pintado (la usan las capturas). */
    __mockupReady?: boolean;
  }
}

type CarGroup = 'retro' | 'nuevo';

interface ShowroomCar {
  id: number;
  name: string;
  tagline: string;
  group: CarGroup;
}

const parseFxId = (raw: string | null): number => {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 && id <= 10 ? id : 1;
};

const parseCarId = (raw: string | null): number => {
  const id = Number(raw);
  return Number.isInteger(id) && id >= 1 && id <= 20 ? id : 1;
};

@Component({
  selector: 'rd-mockup-garage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mockup-garage.page.html',
  styleUrl: './mockup-garage.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MockupGaragePage implements OnInit, OnDestroy {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('canvasHost');
  private readonly params = new URLSearchParams(window.location.search);

  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private readonly currentCarGroup = new Group();
  private fx?: MockupExhaustFx;
  private readonly clock = new Clock();
  private animationId = 0;
  private firstFrame = false;

  /** Modo captura: sin interfaz y con el coche quieto en el ángulo pedido. */
  protected readonly photoMode = this.params.get('shot') === '1';
  private readonly photoTurn = Number(this.params.get('turn') ?? 0);

  protected currentCarId = parseCarId(this.params.get('car'));
  // En las capturas de coches (sin `fx`) no hay efecto, ni el resplandor tenue del escape
  protected currentFxId =
    this.photoMode && !this.params.get('fx') ? 0 : parseFxId(this.params.get('fx'));
  /** En modo captura, `accel=1` deja el coche acelerando para fotografiar el efecto. */
  protected accelerating = this.params.get('accel') === '1';

  protected readonly cars: readonly ShowroomCar[] = [
    // 01-10: el deportivo retro del juego, solo con otra pintura.
    { id: 1, name: 'Morado Synthwave', tagline: 'El color original del Retro', group: 'retro' },
    { id: 2, name: 'Cian Eléctrico', tagline: 'Frío, limpio, muy ochentero', group: 'retro' },
    { id: 3, name: 'Rosa Neón', tagline: 'El clásico de los arcades', group: 'retro' },
    { id: 4, name: 'Verde Ácido', tagline: 'Como un cartel de neón de 1986', group: 'retro' },
    { id: 5, name: 'Amarillo Solar', tagline: 'Atardecer sobre la rejilla', group: 'retro' },
    { id: 6, name: 'Púrpura Profundo', tagline: 'Medianoche en Neo-Tokio', group: 'retro' },
    { id: 7, name: 'Blanco Hielo', tagline: 'Limpio, con aristas rosas', group: 'retro' },
    { id: 8, name: 'Negro Medianoche', tagline: 'Casi invisible, todo neón', group: 'retro' },
    { id: 9, name: 'Azul Marino', tagline: 'Elegancia de los 80', group: 'retro' },
    { id: 10, name: 'Naranja Atardecer', tagline: 'El sol de la portada', group: 'retro' },
    // 11-20: propuestas nuevas con la misma construcción.
    {
      id: 11,
      name: 'Comet GT',
      tagline: 'Deportivo de homologación, ancho y con alerón',
      group: 'nuevo',
    },
    { id: 12, name: 'Night Shade', tagline: 'Muscle car negro con neón violeta', group: 'nuevo' },
    {
      id: 13,
      name: 'Mirage Turbo',
      tagline: 'Rally de grupo B con faros en el techo',
      group: 'nuevo',
    },
    {
      id: 14,
      name: 'Vortex LM',
      tagline: 'Prototipo de resistencia y aleta de tiburón',
      group: 'nuevo',
    },
    {
      id: 15,
      name: 'Sunset Van',
      tagline: 'Furgoneta de los 80 con franjas de atardecer',
      group: 'nuevo',
    },
    {
      id: 16,
      name: 'Outlaw 4x4',
      tagline: 'Pickup elevada, barra antivuelco y caja abierta',
      group: 'nuevo',
    },
    {
      id: 17,
      name: 'Venom 88',
      tagline: 'Hiperdeportivo en cuña, faros escamoteables',
      group: 'nuevo',
    },
    { id: 18, name: 'Chrome Drift', tagline: 'Coupé JDM ensanchado con alerón GT', group: 'nuevo' },
    {
      id: 19,
      name: 'Moon Runner',
      tagline: 'Shooting brake largo con baca y piloto corrido',
      group: 'nuevo',
    },
    {
      id: 20,
      name: 'Solaris X',
      tagline: 'Concept car dorado con cabina de burbuja',
      group: 'nuevo',
    },
  ];

  protected readonly retroCars = this.cars.filter((car) => car.group === 'retro');
  protected readonly newCars = this.cars.filter((car) => car.group === 'nuevo');

  protected readonly fxs = MOCKUP_FX;

  protected get currentCar(): ShowroomCar {
    return this.cars.find((car) => car.id === this.currentCarId) ?? this.cars[0];
  }

  ngOnInit(): void {
    this.initThree();
    this.updateCar();
    this.animate();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeydown);
    window.addEventListener('keyup', this.onKeyup);
  }

  /** Espacio acelera, como en el juego. */
  private readonly onKeyup = (event: KeyboardEvent): void => {
    if (event.code === 'Space') this.accelerating = false;
  };

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('keyup', this.onKeyup);
    this.fx?.dispose();
    this.renderer?.dispose();
  }

  private initThree(): void {
    this.scene = new Scene();
    this.scene.background = new Color(0x0b0714);
    this.scene.fog = new FogExp2(0x0b0714, 0.028);

    const width = this.host().nativeElement.clientWidth || window.innerWidth;
    const height = this.host().nativeElement.clientHeight || window.innerHeight;

    this.camera = new PerspectiveCamera(32, width / height, 0.1, 200);
    if (this.photoMode && this.params.get('wide') === '1') {
      // Captura de efectos: más abierta para que quepa la estela entera detrás del coche.
      this.camera.fov = 40;
      this.camera.position.set(4.6, 2.9, -5.8);
      this.camera.lookAt(1.7, 0.6, 0.7);
      this.camera.updateProjectionMatrix();
    } else if (this.photoMode) {
      // Modo captura: plano cercano y limpio, sin interfaz.
      this.camera.position.set(3.0, 1.9, -4.2);
      this.camera.lookAt(0, 0.55, 0);
    } else if (width <= 720) {
      // Móvil: panel abajo, coche algo por encima del centro.
      this.camera.fov = 38;
      this.camera.position.set(3.9, 2.6, -6.0);
      this.camera.lookAt(0, 0.3, 0);
      this.camera.updateProjectionMatrix();
    } else {
      // Modo showroom: más lejos para que el coche entero quede a la derecha del panel.
      this.camera.fov = 34;
      this.camera.position.set(4.4, 2.7, -6.6);
      this.camera.lookAt(1.4, 0.55, 0);
      this.camera.updateProjectionMatrix();
    }

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.host().nativeElement.appendChild(this.renderer.domElement);

    this.scene.add(new AmbientLight(0xffffff, 1.2));
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(5, 10, -5);
    this.scene.add(sun);

    // Suelo con rejilla y plataforma giratoria.
    const grid = new GridHelper(30, 30, 0x2a1f45, 0x1a1230);
    grid.position.y = -0.12;
    this.scene.add(grid);

    const platform = new Mesh(
      new CylinderGeometry(2.05, 2.2, 0.12, 64),
      new MeshBasicMaterial({ color: 0x14101f }),
    );
    platform.position.y = -0.06;
    this.scene.add(platform);

    const cyanRing = new Mesh(
      new TorusGeometry(2.03, 0.015, 8, 96),
      new MeshBasicMaterial({ color: 0x2de2e6 }),
    );
    cyanRing.rotation.x = -Math.PI / 2;
    cyanRing.position.y = 0.01;
    this.scene.add(cyanRing);

    const pinkRing = new Mesh(
      new TorusGeometry(2.19, 0.01, 8, 96),
      new MeshBasicMaterial({ color: 0xff4fd8 }),
    );
    pinkRing.rotation.x = -Math.PI / 2;
    pinkRing.position.y = 0.01;
    this.scene.add(pinkRing);

    // Fondo: barras verticales de neón y un halo, como un cartel de los 80.
    const barColors = [0xff4fd8, 0x2de2e6, 0xff4fd8, 0xffd319, 0x2de2e6, 0xff4fd8, 0x2de2e6];
    barColors.forEach((color, i) => {
      const bar = new Mesh(new BoxGeometry(0.04, 3.4, 0.04), new MeshBasicMaterial({ color }));
      bar.position.set(-3.6 + i * 1.2, 1.65, 4.8);
      this.scene.add(bar);
    });
    const halo = new Mesh(
      new TorusGeometry(2.2, 0.02, 8, 96),
      new MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.5 }),
    );
    halo.position.set(0, 2.2, 5.2);
    this.scene.add(halo);

    this.scene.add(this.currentCarGroup);
  }

  private readonly onResize = (): void => {
    const width = this.host().nativeElement.clientWidth || window.innerWidth;
    const height = this.host().nativeElement.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
      this.accelerating = true;
    } else if (event.key === 'ArrowLeft') {
      this.selectCar(this.currentCarId === 1 ? 20 : this.currentCarId - 1);
    } else if (event.key === 'ArrowRight') {
      this.selectCar(this.currentCarId === 20 ? 1 : this.currentCarId + 1);
    }
  };

  private updateCar(): void {
    this.fx?.dispose();
    this.currentCarGroup.clear();
    const car = buildMockupCar(this.currentCarId);
    // Puntos de salida de los efectos según el tamaño del coche (antes de girarlo)
    const size = new Box3().setFromObject(car);
    this.fx = new MockupExhaustFx(car, {
      rearZ: size.max.z,
      halfWidth: Math.min(size.max.x, 0.85),
      roofY: size.max.y,
      exhaustY: 0.32,
    });
    this.currentCarGroup.add(car);
    this.currentCarGroup.rotation.y = this.photoMode ? this.photoTurn : 0;
  }

  protected selectCar(id: number): void {
    this.currentCarId = id;
    this.updateCar();
  }

  protected selectFx(id: number): void {
    this.currentFxId = id;
  }

  protected toggleAccelerate(value: boolean): void {
    this.accelerating = value;
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (!this.photoMode) this.currentCarGroup.rotation.y += dt * 0.45;
    this.fx?.update(dt, this.accelerating, this.currentFxId);
    this.renderer.render(this.scene, this.camera);

    if (!this.firstFrame) {
      this.firstFrame = true;
      window.__mockupReady = true;
    }
  }
}
