import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  EdgesGeometry,
  ExtrudeGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Shape,
  TorusGeometry,
} from 'three';

/**
 * Iteración 4: Solo el coche RETRO (el deportivo de cuña de los 80 del proyecto) 
 * con 10 variantes de color de pintura. La forma es EXACTA a la del proyecto.
 */

function shape(points: readonly (readonly [number, number])[]): Shape {
  const s = new Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [u, v] of points.slice(1)) s.lineTo(u, v);
  s.lineTo(points[0][0], points[0][1]);
  return s;
}

const NEON_PINK = 0xff4fd8;
const NEON_CYAN = 0x2de2e6;

const retroProfile = [
  [-1.32, 0.2], [-1.36, 0.56], [-1.1, 0.64], [-0.42, 0.98],
  [0.2, 0.98], [0.82, 0.62], [1.36, 0.5], [1.4, 0.3], [1.26, 0.18],
] as const;

export function buildMockupCar(id: number): Group {
  const g = new Group();

  const flat = (color: number) => new MeshBasicMaterial({ color });

  // Paletas de colores para la carrocería del coche retro
  const palettes: Record<number, number> = {
    1: 0x8a78cf, // Morado original
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

  // Cuerpo principal (extrusión del perfil lateral)
  const body = new ExtrudeGeometry(shape(retroProfile), {
    depth: 1.46,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 1,
  });
  body.translate(0, 0, -0.73);
  body.rotateY(Math.PI / 2);

  g.add(new Mesh(body, flat(bodyColor)));
  g.add(
    new LineSegments(
      new EdgesGeometry(body, 25),
      new LineBasicMaterial({ color: NEON_PINK }),
    ),
  );

  // Lunas oscuras
  const glass = new ExtrudeGeometry(
    shape([
      [-0.36, 0.68], [-0.32, 0.94], [0.16, 0.94], [0.66, 0.66],
    ]),
    { depth: 1.5, bevelEnabled: false },
  );
  glass.translate(0, 0.02, -0.75);
  glass.rotateY(Math.PI / 2);
  g.add(new Mesh(glass, flat(0x120630)));

  // Luz trasera corrida y faros escamoteables
  const tail = new Mesh(new BoxGeometry(1.36, 0.12, 0.05), new MeshBasicMaterial({ color: 0xff2a6d }));
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

  // Ruedas con aro cian
  const tyre = new CylinderGeometry(0.3, 0.3, 0.24, 14);
  tyre.rotateZ(Math.PI / 2);
  const rim = new TorusGeometry(0.2, 0.035, 6, 18);
  rim.rotateY(Math.PI / 2);
  const tyreMat = flat(0x0b0614);
  const rimMat = new MeshBasicMaterial({ color: NEON_CYAN });

  for (const [x, z] of [[-0.74, -0.82], [0.74, -0.82], [-0.74, 0.86], [0.74, 0.86]]) {
    const wheel = new Mesh(tyre, tyreMat);
    wheel.position.set(x, 0.3, z);
    const ring = new Mesh(rim, rimMat);
    ring.position.set(x * 1.17, 0.3, z);
    g.add(wheel, ring);
  }

  // Luz de bajos (underglow)
  const glow = new Mesh(
    new PlaneGeometry(1.9, 3.2),
    new MeshBasicMaterial({
      color: NEON_CYAN,
      transparent: true,
      opacity: 0.35,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.03;
  g.add(glow);

  return g;
}