import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Shape,
  TorusGeometry,
} from 'three';
import { flat } from '../track-mesh';

// Vehículos de las estéticas synthwave. Mismas medidas que el coche clásico (1,4 × 2,6 m,
// morro hacia -z) para que la física, la cámara y los efectos encajen igual.

const NEON_PINK = 0xff4fd8;
const NEON_CYAN = 0x2de2e6;

const ghostMaterial = () =>
  new MeshBasicMaterial({
    color: NEON_CYAN,
    transparent: true,
    opacity: 0.22,
    blending: AdditiveBlending,
    depthWrite: false,
  });

function shape(points: readonly (readonly [number, number])[]): Shape {
  const s = new Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [u, v] of points.slice(1)) s.lineTo(u, v);
  s.lineTo(points[0][0], points[0][1]);
  return s;
}

/** Luz de bajos: rectángulo aditivo pegado al suelo. */
function underglow(ghost: boolean): Mesh {
  const glow = new Mesh(
    new PlaneGeometry(1.9, 3.2),
    new MeshBasicMaterial({
      color: NEON_CYAN,
      transparent: true,
      opacity: ghost ? 0.1 : 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  glow.name = 'underglow';
  return glow;
}

/** Retro: deportivo de cuña de los 80 de diseño propio, perfil lateral extruido a lo ancho. */
export function buildRetroCar(ghost = false): Group {
  const g = new Group();
  const profile = shape([
    [-1.32, 0.2],
    [-1.36, 0.56],
    [-1.1, 0.64],
    [-0.42, 0.98],
    [0.2, 0.98],
    [0.82, 0.62],
    [1.36, 0.5],
    [1.4, 0.3],
    [1.26, 0.18],
  ]);
  const body = new ExtrudeGeometry(profile, {
    depth: 1.46,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 1,
  });
  body.translate(0, 0, -0.73);
  body.rotateY(Math.PI / 2);
  const bodyMat: Material = ghost ? ghostMaterial() : flat(0x8a78cf);
  g.add(new Mesh(body, bodyMat));
  g.add(
    new LineSegments(
      new EdgesGeometry(body, 25),
      new LineBasicMaterial({ color: ghost ? NEON_CYAN : NEON_PINK }),
    ),
  );

  if (!ghost) {
    // Lunas oscuras
    const glass = new ExtrudeGeometry(
      shape([
        [-0.36, 0.68],
        [-0.32, 0.94],
        [0.16, 0.94],
        [0.66, 0.66],
      ]),
      { depth: 1.5, bevelEnabled: false },
    );
    glass.translate(0, 0.02, -0.75);
    glass.rotateY(Math.PI / 2);
    g.add(new Mesh(glass, flat(0x120630)));
    // Luz trasera corrida y faros escamoteables
    const tail = new Mesh(
      new BoxGeometry(1.36, 0.12, 0.05),
      new MeshBasicMaterial({ color: 0xff2a6d }),
    );
    tail.position.set(0, 0.46, 1.4);
    g.add(tail);
    for (const x of [-0.45, 0.45]) {
      const lamp = new Mesh(
        new BoxGeometry(0.34, 0.08, 0.22),
        new MeshBasicMaterial({ color: 0xfff6c8 }),
      );
      lamp.position.set(x, 0.56, -1.12);
      g.add(lamp);
    }
  }

  // Ruedas con aro cian
  const tyre = new CylinderGeometry(0.3, 0.3, 0.24, 14);
  tyre.rotateZ(Math.PI / 2);
  const rim = new TorusGeometry(0.2, 0.035, 6, 18);
  rim.rotateY(Math.PI / 2);
  const tyreMat = ghost ? ghostMaterial() : flat(0x0b0614);
  const rimMat = new MeshBasicMaterial({ color: NEON_CYAN });
  for (const [x, z] of [
    [-0.74, -0.82],
    [0.74, -0.82],
    [-0.74, 0.86],
    [0.74, 0.86],
  ]) {
    const wheel = new Mesh(tyre, tyreMat);
    wheel.position.set(x, 0.3, z);
    const ring = new Mesh(rim, rimMat);
    ring.position.set(x * 1.17, 0.3, z);
    g.add(wheel, ring);
  }
  g.add(underglow(ghost));
  return g;
}

/** Futurista: nave en forma de punta de flecha con canto de neón y dos propulsores. */
export function buildShip(ghost = false): Group {
  const g = new Group();
  const hull = new ExtrudeGeometry(
    shape([
      [0, 1.6],
      [0.85, -1.25],
      [0, -0.75],
      [-0.85, -1.25],
    ]),
    { depth: 0.38, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 1 },
  );
  hull.rotateX(-Math.PI / 2);
  hull.translate(0, 0.22, 0);
  g.add(new Mesh(hull, ghost ? ghostMaterial() : flat(0x170a35)));
  g.add(new LineSegments(new EdgesGeometry(hull, 20), new LineBasicMaterial({ color: NEON_CYAN })));
  const spine = new Mesh(
    new BoxGeometry(0.08, 0.06, 2.2),
    new MeshBasicMaterial({ color: ghost ? NEON_CYAN : NEON_PINK }),
  );
  spine.position.set(0, 0.72, -0.1);
  g.add(spine);
  if (!ghost) {
    for (const x of [-0.42, 0.42]) {
      const jet = new Mesh(
        new BoxGeometry(0.28, 0.16, 0.12),
        new MeshBasicMaterial({ color: 0xffd319 }),
      );
      jet.position.set(x, 0.42, 1.12);
      g.add(jet);
    }
  }
  // Sin luz de bajos: con la forma de flecha se veía como un cuadrado claro debajo de la nave.
  // El brillo lo ponen los propulsores (efecto de escape)
  return g;
}
