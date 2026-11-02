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
  CapsuleGeometry,
  ExtrudeGeometry,
  Shape,
} from 'three';
import { flat } from './track-mesh';

/** 
 * Modelos de prueba con más personalidad, inspirados en la construcción 
 * de los vehículos originales del proyecto (extrusiones y siluetas marcadas).
 */

function shape(points: readonly (readonly [number, number])[]): Shape {
  const s = new Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [u, v] of points.slice(1)) s.lineTo(u, v);
  s.lineTo(points[0][0], points[0][1]);
  return s;
}

export function buildMockupCar(id: number): Group {
  const g = new Group();
  const shadow = () => {
    const s = new Mesh(
      new PlaneGeometry(2.0, 3.5),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.01;
    return s;
  };

  const add = (geo: BufferGeometry, color: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(geo, flat(color));
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };

  switch (id) {
    case 4: { // Muscle - "The Beast" (Inspiración Charger/Mustang agresivo)
      // Cuerpo principal con caída fastback
      const body = add(new BoxGeometry(1.5, 0.6, 3.0), 0x1a1a1a, 0, 0.5, 0);
      const cabin = add(new BoxGeometry(1.2, 0.4, 1.4), 0x0d0d0d, 0, 1.0, 0.3);
      cabin.rotation.x = -0.1;
      
      // Motor sobresaliendo (Blower)
      add(new BoxGeometry(0.6, 0.3, 0.5), 0x888888, 0, 0.9, -0.7);
      add(new BoxGeometry(0.7, 0.1, 0.55), 0x333333, 0, 1.05, -0.7); // Tapa del blower
      
      // Frontal agresivo (Rejilla hundida)
      add(new BoxGeometry(1.4, 0.3, 0.1), 0x050505, 0, 0.5, -1.5);
      // Faros circulares pequeños
      for (const x of [-0.5, 0.5]) add(new CylinderGeometry(0.1, 0.1, 0.05, 8), 0xffffcc, x, 0.5, -1.51).rotation.x = Math.PI/2;
      break;
    }

    case 5: { // JDM-Drift - "Night Slider" (Estilo Supra/Skyline con kit ancho)
      // Cuerpo bajo y ancho
      add(new BoxGeometry(1.6, 0.35, 2.8), 0xdd2266, 0, 0.4, 0);
      const cabin = add(new BoxGeometry(1.1, 0.4, 1.2), 0x111111, 0, 0.8, 0.1);
      
      // Kit de ensanche (fenders)
      for (const x of [-0.85, 0.85]) {
        add(new BoxGeometry(0.15, 0.4, 0.8), 0xdd2266, x, 0.4, -0.9);
        add(new BoxGeometry(0.15, 0.4, 0.8), 0xdd2266, x, 0.4, 1.0);
      }
      
      // Alerón de competición (GT Wing)
      const wingTop = add(new BoxGeometry(1.7, 0.05, 0.5), 0x111111, 0, 1.2, 1.3);
      for (const x of [-0.6, 0.6]) add(new BoxGeometry(0.05, 0.5, 0.1), 0x333333, x, 0.9, 1.25);
      
      // Intercooler frontal
      add(new BoxGeometry(0.8, 0.25, 0.1), 0x777777, 0, 0.35, -1.4);
      break;
    }

    case 7: { // F-Race - "Apex Hunter" (Fórmula 1 moderno)
      // Monocasco estrecho
      const nose = shape([[0, 0.3], [0.35, -1.5], [-0.35, -1.5]]);
      const noseGeo = new ExtrudeGeometry(nose, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.05 });
      const n = new Mesh(noseGeo, flat(0xee0000));
      n.rotation.x = -Math.PI / 2;
      n.position.y = 0.2;
      g.add(n);

      // Pontones laterales (Sidepods)
      for (const x of [-0.5, 0.5]) {
        const pod = add(new BoxGeometry(0.4, 0.35, 1.2), 0xee0000, x, 0.4, 0.1);
        pod.rotation.y = x * 0.2;
      }

      // Alerones complejos
      add(new BoxGeometry(1.8, 0.05, 0.5), 0x111111, 0, 0.3, -1.3); // Delantero
      add(new BoxGeometry(1.4, 0.1, 0.6), 0xee0000, 0, 1.1, 1.4); // Trasero DRS
      for (const x of [-0.6, 0.6]) add(new BoxGeometry(0.1, 0.8, 0.5), 0xee0000, x, 0.7, 1.4);
      
      // Toma de aire superior (Airbox)
      add(new BoxGeometry(0.3, 0.3, 0.4), 0x111111, 0, 1.1, 0.4);
      break;
    }

    case 8: { // Hyper-Pod - "Zenith" (Sci-Fi Orgánico)
      // Cápsula central (Cockpit de burbuja)
      const bubble = new Mesh(new SphereGeometry(0.85, 12, 12), new MeshBasicMaterial({ 
        color: 0x00ffff, transparent: true, opacity: 0.5, blending: 1 
      }));
      bubble.scale.set(1, 0.8, 1.1);
      bubble.position.y = 0.8;
      g.add(bubble);

      // Estructura de levitación (4 pods)
      const ring = new TorusGeometry(0.4, 0.1, 8, 16);
      for (const [x, z] of [[-0.9, -0.8], [0.9, -0.8], [-0.9, 0.9], [0.9, 0.9]]) {
        const engine = add(ring, 0x222222, x, 0.4, z);
        engine.rotation.x = Math.PI / 2;
        // Núcleo de energía
        add(new SphereGeometry(0.2, 8, 8), 0x00ffff, x, 0.4, z);
      }
      // Chasis de conexión
      add(new BoxGeometry(1.8, 0.15, 0.8), 0x111111, 0, 0.4, 0);
      break;
    }

    case 10: { // Proto-LeMans - "Endurance V" (Hypercar de resistencia)
      // Cuerpo extremadamente plano y ancho
      add(new BoxGeometry(1.9, 0.25, 3.4), 0xffffff, 0, 0.3, 0);
      
      // Cabina estrecha centrada
      const cabin = add(new BoxGeometry(0.7, 0.4, 1.2), 0x0a0a0a, 0, 0.6, 0);
      
      // Aleta de tiburón (Shark Fin) integrada
      const fin = add(new BoxGeometry(0.04, 0.7, 1.8), 0xffffff, 0, 0.7, 0.8);
      
      // Alerón trasero gigante unido a la aleta
      add(new BoxGeometry(1.9, 0.05, 0.6), 0xffffff, 0, 0.9, 1.6);
      for (const x of [-0.9, 0.9]) add(new BoxGeometry(0.05, 0.6, 0.6), 0x0000ff, x, 0.6, 1.6); // Endplates azules
      
      // Luces LED verticales (típicas de Le Mans)
      for (const x of [-0.8, 0.8]) {
        add(new BoxGeometry(0.08, 0.3, 0.05), 0xffffff, x, 0.35, -1.65);
      }
      break;
    }

    case 6: { // Cyber-Truck - "The Polygon" (Geometría low-poly agresiva)
      const s = shape([[0, 1.2], [1.5, 0.4], [1.5, 0], [-1.5, 0], [-1.5, 0.4]]);
      const geo = new ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: false });
      const truck = new Mesh(geo, flat(0x555555));
      truck.rotateY(Math.PI / 2);
      truck.translateZ(-0.8);
      g.add(truck);
      
      // Tira de LED frontal
      add(new BoxGeometry(1.5, 0.05, 0.05), 0xffffff, 0, 0.42, -1.51);
      break;
    }

    case 9: { // Van-Life - "Turbo Camper" (Inspirada en la ID.Buzz de carreras)
      add(new BoxGeometry(1.4, 1.3, 2.8), 0x44bbff, 0, 0.8, 0);
      // Banda blanca lateral
      add(new BoxGeometry(1.42, 0.3, 2.81), 0xffffff, 0, 0.6, 0);
      // Ventanales corridos
      add(new BoxGeometry(1.3, 0.4, 2.4), 0x111111, 0, 1.1, 0.1);
      // Escalera trasera y portaequipajes
      add(new BoxGeometry(0.3, 1.0, 0.1), 0x222222, 0.4, 0.8, 1.41);
      add(new BoxGeometry(1.0, 0.1, 1.8), 0x222222, 0, 1.5, 0.2);
      break;
    }

    case 1: // Classic (Mejorado)
      add(new BoxGeometry(1.4, 0.45, 2.6), 0xff5a36, 0, 0.5, 0);
      add(new BoxGeometry(1.3, 0.25, 0.6), 0xff5a36, 0, 0.4, -1.5);
      add(new BoxGeometry(1.05, 0.42, 1.15), 0x1d2433, 0, 0.94, 0.15);
      break;

    case 2: // Wedge (Retro original)
      add(new BoxGeometry(1.5, 0.4, 2.8), 0x8a78cf, 0, 0.4, 0);
      add(new BoxGeometry(1.2, 0.3, 1.0), 0x111111, 0, 0.7, -0.2);
      break;

    case 3: // Arrow (Ship original)
      add(new BoxGeometry(0.2, 0.2, 2.5), 0x2de2e6, 0, 0.5, 0);
      add(new BoxGeometry(1.5, 0.1, 1.5), 0x170a35, 0, 0.4, 0.3);
      break;
  }

  // Ruedas deportivas con llanta (para los que no flotan)
  if (id !== 3 && id !== 8) {
    const wheelGeo = new CylinderGeometry(0.38, 0.38, 0.28, 16);
    const rimGeo = new CylinderGeometry(0.25, 0.25, 0.29, 12);
    for (const [x, z] of [[-0.78, -0.9], [0.78, -0.9], [-0.78, 1.1], [0.78, 1.1]]) {
      const w = add(wheelGeo, 0x111111, x, 0.38, z);
      w.rotation.z = Math.PI / 2;
      const r = add(rimGeo, 0x555555, x, 0.38, z);
      r.rotation.z = Math.PI / 2;
    }
  }

  if (id !== 3 && id !== 8) g.add(shadow());

  return g;
}
