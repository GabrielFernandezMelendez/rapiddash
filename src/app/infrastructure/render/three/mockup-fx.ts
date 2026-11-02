import {
  AdditiveBlending,
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
} from 'three';
import { canvasTexture } from './track-mesh';

export class MockupExhaustFx {
  private particles: { obj: any; life: number; velocity: Vector3; type: number }[] = [];
  private textureCache: Record<string, Texture> = {};

  constructor(private scene: Scene, private car: Group) {}

  update(dt: number, accelerating: boolean, type: number): void {
    if (accelerating && Math.random() < 0.3) {
      this.emit(type);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.obj);
        this.particles.splice(i, 1);
        continue;
      }

      p.obj.position.addScaledVector(p.velocity, dt);
      
      if (p.obj instanceof Sprite) {
        (p.obj.material as SpriteMaterial).opacity = p.life * 2;
      } else {
        (p.obj.material as MeshBasicMaterial).opacity = p.life * 2;
      }
    }
  }

  private emit(type: number): void {
    let obj: any;
    let life = 0.5;
    let velocity = new Vector3((Math.random() - 0.5) * 2, Math.random() * 2, 5 + Math.random() * 5);
    
    // Transform velocity to world space based on car direction (backwards)
    const back = new Vector3();
    this.car.getWorldDirection(back);
    velocity.applyQuaternion(this.car.quaternion);

    switch (type) {
      case 1: // Classic Sparks
        obj = this.createSprite(0xffaa00, 0.3);
        break;
      case 2: // Neon Streak
        obj = new Mesh(new PlaneGeometry(0.1, 1), new MeshBasicMaterial({ color: 0x00ffff, blending: AdditiveBlending, transparent: true }));
        obj.rotation.copy(this.car.rotation);
        life = 0.3;
        break;
      case 3: // Plasma Burn
        obj = this.createSprite(0x00ff44, 0.6);
        life = 0.4;
        break;
      case 4: // Ghost Echo
        // Simplificado: un cubo que se queda quieto
        obj = new Mesh(new PlaneGeometry(1.4, 0.5), new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 }));
        velocity.set(0, 0, 0);
        life = 0.2;
        break;
      case 5: // Digital Pixels
        obj = new Mesh(new PlaneGeometry(0.15, 0.15), new MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff00ff : 0x00ffff }));
        break;
      case 6: // Dark Void
        obj = this.createSprite(0x111111, 0.8);
        break;
      case 7: // Rainbow Flow
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        obj = this.createSprite(colors[Math.floor(Math.random() * colors.length)], 0.4);
        break;
      case 8: // Gold Dust
        obj = this.createSprite(0xffd700, 0.15);
        life = 0.8;
        velocity.multiplyScalar(0.4);
        break;
      case 9: // Lightning Arcs
        obj = new Mesh(new PlaneGeometry(0.05, 0.8), new MeshBasicMaterial({ color: 0x8888ff, blending: AdditiveBlending, transparent: true }));
        obj.rotation.z = Math.random() * Math.PI;
        life = 0.1;
        break;
      case 10: // Fireball
        obj = this.createSprite(0xff4400, 1.0);
        velocity.y += 2;
        break;
      default:
        obj = this.createSprite(0xffffff, 0.2);
    }

    const pos = new Vector3((Math.random() - 0.5) * 1, 0.4, 1.3);
    pos.applyQuaternion(this.car.quaternion);
    pos.add(this.car.position);
    
    obj.position.copy(pos);
    this.scene.add(obj);
    this.particles.push({ obj, life, velocity, type });
  }

  private createSprite(color: number, size: number): Sprite {
    const key = `${color}`;
    if (!this.textureCache[key]) {
      this.textureCache[key] = canvasTexture(32, 32, (g) => {
        const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        const c = '#' + color.toString(16).padStart(6, '0');
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, c);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 32, 32);
      });
    }
    const s = new Sprite(new SpriteMaterial({ map: this.textureCache[key], blending: AdditiveBlending, transparent: true, depthWrite: false }));
    s.scale.set(size, size, 1);
    return s;
  }
}
