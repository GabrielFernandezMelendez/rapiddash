import { ChangeDetectionStrategy, Component, ElementRef, inject, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Group,
  Clock,
  Color,
  FogExp2,
  GridHelper,
} from 'three';
import { buildMockupCar } from '../../../infrastructure/render/three/mockup-vehicles';
import { MockupExhaustFx } from '../../../infrastructure/render/three/mockup-fx';

@Component({
  selector: 'rd-mockup-garage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mockup-garage.page.html',
  styleUrl: './mockup-garage.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MockupGaragePage implements OnInit {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('canvasHost');
  
  private scene!: Scene;
  private camera!: PerspectiveCamera;
  private renderer!: WebGLRenderer;
  private currentCarGroup = new Group();
  private fx!: MockupExhaustFx;
  private clock = new Clock();

  protected currentCarId = 1;
  protected currentFxId = 1;
  protected accelerating = false;

  protected cars = [
    { id: 1, name: 'Clásico Naranja' },
    { id: 2, name: 'Clásico Azul' },
    { id: 3, name: 'Clásico Rosa' },
    { id: 4, name: 'Clásico Verde' },
    { id: 5, name: 'Clásico Amarillo' },
    { id: 6, name: 'Clásico Púrpura' },
    { id: 7, name: 'Clásico Blanco' },
    { id: 8, name: 'Clásico Negro' },
    { id: 9, name: 'Clásico Azul Marino' },
    { id: 10, name: 'Clásico Naranja Quemado' },
  ];

  protected fxs = [
    { id: 1, name: 'Classic Sparks' },
    { id: 2, name: 'Neon Streak' },
    { id: 3, name: 'Plasma Burn' },
    { id: 4, name: 'Ghost Echo' },
    { id: 5, name: 'Digital Pixels' },
    { id: 6, name: 'Dark Void' },
    { id: 7, name: 'Rainbow Flow' },
    { id: 8, name: 'Gold Dust' },
    { id: 9, name: 'Lightning Arcs' },
    { id: 10, name: 'Fireball' },
  ];

  ngOnInit() {
    this.initThree();
    this.updateCar();
    this.animate();
  }

  private initThree() {
    this.scene = new Scene();
    this.scene.background = new Color(0x111111);
    this.scene.fog = new FogExp2(0x111111, 0.05);

    this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(3, 2, 5);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.host().nativeElement.appendChild(this.renderer.domElement);

    const ambient = new AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new DirectionalLight(0xffffff, 0.8);
    sun.position.set(5, 10, 5);
    this.scene.add(sun);

    const grid = new GridHelper(20, 20, 0x333333, 0x222222);
    this.scene.add(grid);

    this.scene.add(this.currentCarGroup);
    
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private updateCar() {
    this.currentCarGroup.clear();
    const car = buildMockupCar(this.currentCarId);
    this.currentCarGroup.add(car);
    this.fx = new MockupExhaustFx(this.scene, car);
  }

  protected selectCar(id: number) {
    this.currentCarId = id;
    this.updateCar();
  }

  protected selectFx(id: number) {
    this.currentFxId = id;
  }

  protected toggleAccelerate(val: boolean) {
    this.accelerating = val;
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    const dt = this.clock.getDelta();

    this.currentCarGroup.rotation.y += dt * 0.5;
    this.fx.update(dt, this.accelerating, this.currentFxId);

    this.renderer.render(this.scene, this.camera);
  }
}
