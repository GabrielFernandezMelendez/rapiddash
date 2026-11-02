import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { flat } from './track-mesh';

/** Modelos de prueba para el garaje */

export function buildMockupCar(id: number): Group {
  const g = new Group();
  const shadow = () => {
    const s = new Mesh(
      new PlaneGeometry(1.8, 3.2),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.02;
    return s;
  };

  const add = (geo: BufferGeometry, color: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(geo, flat(color));
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };

  const bodyColor = 0xcc2222;
  const cabinColor = 0x111111;

  switch (id) {
    case 1: // Classic (ya existe, pero lo recreo simplificado)
      add(new BoxGeometry(1.4, 0.5, 2.6), 0xff5a36, 0, 0.5, 0);
      add(new BoxGeometry(1.0, 0.4, 1.2), 0x1d2433, 0, 0.9, 0.2);
      break;

    case 4: // Muscle
      add(new BoxGeometry(1.5, 0.7, 3.0), 0x222222, 0, 0.55, 0);
      add(new BoxGeometry(1.1, 0.45, 1.0), 0x111111, 0, 1.1, 0.2);
      add(new BoxGeometry(0.5, 0.3, 0.4), 0x777777, 0, 0.95, -0.8); // Air intake
      break;

    case 5: // JDM-Drift
      add(new BoxGeometry(1.4, 0.4, 2.7), 0x2255ff, 0, 0.45, 0);
      add(new BoxGeometry(1.0, 0.4, 1.3), 0x111111, 0, 0.8, 0.1);
      // Wing
      add(new BoxGeometry(1.5, 0.05, 0.4), 0x2255ff, 0, 1.1, 1.2);
      for (const x of [-0.6, 0.6]) add(new BoxGeometry(0.05, 0.4, 0.1), 0x111111, x, 0.9, 1.2);
      break;

    case 6: // Cyber-Truck
      add(new BoxGeometry(1.6, 0.8, 3.2), 0x888888, 0, 0.6, 0);
      add(new BoxGeometry(1.61, 0.05, 3.21), 0xffffff, 0, 0.6, 0); // Neon edge line simulation
      break;

    case 7: // F-Race
      add(new BoxGeometry(0.7, 0.4, 2.8), 0xee0000, 0, 0.4, 0); // Main body
      add(new BoxGeometry(1.6, 0.08, 0.5), 0xee0000, 0, 0.3, -1.2); // Front wing
      add(new BoxGeometry(1.5, 0.1, 0.4), 0xee0000, 0, 0.9, 1.3); // Rear wing
      for (const x of [-0.5, 0.5]) add(new BoxGeometry(0.1, 0.6, 0.2), 0x111111, x, 0.7, 1.3);
      break;

    case 8: // Hyper-Pod
      const podBody = new Mesh(new SphereGeometry(0.8, 8, 8), new MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.6 }));
      podBody.scale.set(1, 0.7, 1.2);
      podBody.position.set(0, 0.8, 0);
      g.add(podBody);
      add(new BoxGeometry(1.6, 0.2, 2.0), 0x111111, 0, 0.3, 0); // Base
      break;

    case 9: // Van-Life
      add(new BoxGeometry(1.4, 1.2, 2.6), 0xffcc00, 0, 0.8, 0);
      add(new BoxGeometry(1.42, 0.4, 0.8), 0x111111, 0, 1.1, -0.8); // Windshield area
      break;

    case 10: // Proto-LeMans
      add(new BoxGeometry(1.8, 0.35, 3.2), 0xffffff, 0, 0.4, 0);
      add(new BoxGeometry(1.0, 0.3, 1.2), 0x111111, 0, 0.7, 0.1);
      add(new BoxGeometry(0.05, 0.6, 1.5), 0xffffff, 0, 0.6, 0.8); // Shark fin
      break;

    case 2: // Wedge (Retro)
      add(new BoxGeometry(1.5, 0.4, 2.8), 0x8a78cf, 0, 0.4, 0);
      add(new BoxGeometry(1.2, 0.3, 1.0), 0x111111, 0, 0.7, -0.2);
      break;

    case 3: // Arrow (Ship)
      add(new BoxGeometry(0.2, 0.2, 2.5), 0x2de2e6, 0, 0.5, 0);
      add(new BoxGeometry(1.5, 0.1, 1.5), 0x170a35, 0, 0.4, 0.3); // Wings
      break;
  }

  // Ruedas para los que no flotan
  if (id !== 3 && id !== 8) {
    const wheelGeo = new CylinderGeometry(0.35, 0.35, 0.25, 12);
    for (const [x, z] of [[-0.8, -0.9], [0.8, -0.9], [-0.8, 1.0], [0.8, 1.0]]) {
      const w = add(wheelGeo, 0x18181c, x, 0.35, z);
      w.rotation.z = Math.PI / 2;
    }
  }

  if (id !== 3) g.add(shadow());

  return g;
}
