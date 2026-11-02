import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import { flat } from '../track-mesh';

/**
 * Iteración 3: Solo el coche clásico (el que ya está en el juego) con 10 variantes de color.
 * Foco: paleta de colores, no forma (la forma se mantiene exacta).
 */

const TYRE = 0x18181c;
const CABIN = 0x1d2433;

export function buildMockupCar(id: number): Group {
  const g = new Group();
  const shadow = () => {
    const s = new Mesh(
      new PlaneGeometry(1.7, 3),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }),
    );
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.03;
    return s;
  };

  const add = (geo: BufferGeometry, color: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(geo, flat(color));
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };

  // Coche clásico EXACTO (misma forma que car-mesh.ts)
  // Paletas de colores para la carrocería
  const palettes: Record<number, number> = {
    1: 0xff5a36, // Naranja clásico (original)
    2: 0x22ccff, // Azul claro
    3: 0xff2255, // Rosa neón
    4: 0x22ff88, // Verde menta
    5: 0xffcc00, // Amarillo carreras
    6: 0x8822ff, // Púrpura
    7: 0xffffff, // Blanco hielo
    8: 0x111111, // Negro mate
    9: 0x4466aa, // Azul marino
    10: 0xff8800, // Naranja quemado
  };

  const bodyColor = palettes[id] || palettes[1];

  // Forma idéntica a car-mesh.ts
  add(new BoxGeometry(1.4, 0.45, 2.6), bodyColor, 0, 0.5, 0);
  add(new BoxGeometry(1.3, 0.25, 0.6), bodyColor, 0, 0.4, -1.5);
  add(new BoxGeometry(1.05, 0.42, 1.15), CABIN, 0, 0.94, 0.15);
  add(new BoxGeometry(1.5, 0.08, 0.35), CABIN, 0, 1.0, 1.25);
  for (const x of [-0.55, 0.55]) add(new BoxGeometry(0.08, 0.3, 0.12), CABIN, x, 0.82, 1.25);
  const wheel = new CylinderGeometry(0.3, 0.3, 0.26, 10);
  for (const [x, z] of [[-0.74, -0.85], [0.74, -0.85], [-0.74, 0.9], [0.74, 0.9]]) {
    add(wheel, TYRE, x, 0.3, z).rotation.z = Math.PI / 2;
  }
  // Faros delanteros
  for (const x of [-0.4, 0.4]) add(new BoxGeometry(0.22, 0.16, 0.08), 0x2b2b30, x, 0.42, 1.32);

  g.add(shadow());
  return g;
}