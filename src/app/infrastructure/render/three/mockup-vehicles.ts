import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
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
 * Catálogo de pruebas del showroom.
 *
 * Los 10 primeros son recoloreados del deportivo retro que ya existe en el juego
 * (`synthwave/vehicles.ts`): misma silueta, lunas, pilotos, llantas y luz de bajos.
 * Los 10 siguientes son propuestas nuevas con la misma filosofía low-poly:
 * perfil lateral extruido, aristas de neón, cabina oscura y detalles de los 80.
 *
 * Convención: el morro mira a -Z y las ruedas van a ±0,74 m, como en el coche real,
 * para que cualquier propuesta se pueda llevar al juego sin tocar la física.
 */

type Point = readonly [number, number];
type Profile = readonly Point[];

type Paint = {
  /** Pintura de la carrocería. */
  body: number;
  /** Aristas y líneas de neón. */
  accent: number;
  /** Aros de las llantas. */
  rim: number;
  /** Lunas. */
  glass: number;
  /** Luz de bajos. */
  glow: number;
  /** Faros. */
  head: number;
  /** Pilotos traseros. */
  tail: number;
};

const flat = (color: number) => new MeshBasicMaterial({ color });

function shape(points: Profile): Shape {
  const s = new Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (const [u, v] of points.slice(1)) s.lineTo(u, v);
  s.lineTo(points[0][0], points[0][1]);
  return s;
}

/** Extruye un perfil lateral y lo centra: el morro del perfil (x+) queda en -Z. */
function extruded(profile: Profile, depth: number, bevel = 0.05): ExtrudeGeometry {
  const geo = new ExtrudeGeometry(shape(profile), {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(Math.PI / 2);
  return geo;
}

function add(g: Group, mesh: Mesh, x = 0, y = 0, z = 0): Mesh {
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

function box(
  g: Group,
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
): Mesh {
  return add(g, new Mesh(new BoxGeometry(w, h, d), flat(color)), x, y, z);
}

function cyl(
  g: Group,
  radius: number,
  height: number,
  color: number,
  x: number,
  y: number,
  z: number,
  axis: 'x' | 'y' | 'z' = 'y',
): Mesh {
  const geo = new CylinderGeometry(radius, radius, height, 16);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  return add(g, new Mesh(geo, flat(color)), x, y, z);
}

/** Copia las aristas de una malla ya colocada para dibujar su contorno de neón. */
function addOutline(g: Group, mesh: Mesh, color: number, threshold = 25): LineSegments {
  const line = new LineSegments(
    new EdgesGeometry(mesh.geometry, threshold),
    new LineBasicMaterial({ color }),
  );
  line.position.copy(mesh.position);
  line.rotation.copy(mesh.rotation);
  line.scale.copy(mesh.scale);
  g.add(line);
  return line;
}

function body(g: Group, profile: Profile, paint: Paint, depth = 1.46, bevel = 0.05): void {
  const geo = extruded(profile, depth, bevel);
  const mesh = add(g, new Mesh(geo, flat(paint.body)));
  // Coraza de neón: una copia algo mayor con las caras interiores.
  // Deja un borde luminoso grueso alrededor de la silueta, no una línea de 1 px.
  const shell = new Mesh(
    geo.clone(),
    new MeshBasicMaterial({ color: paint.accent, side: BackSide }),
  );
  shell.scale.setScalar(1.025);
  g.add(shell);
  addOutline(g, mesh, paint.accent, 25);
}

function canopy(g: Group, profile: Profile, depth: number, paint: Paint, y = 0): void {
  // Un poco más ancha que la carrocería y elevada: así el cristal se lee
  // por encima del borde de neón de la carrocería, no queda enterrado dentro.
  const glassDepth = depth + 0.04;
  const geo = extruded(profile, glassDepth, 0);
  const glass = add(g, new Mesh(geo, flat(paint.glass)), 0, y + 0.09, 0);
  const shell = new Mesh(
    geo.clone(),
    new MeshBasicMaterial({ color: paint.accent, side: BackSide }),
  );
  shell.position.copy(glass.position);
  shell.scale.setScalar(1.04);
  g.add(shell);
}

function wheels(
  g: Group,
  paint: Paint,
  opts: {
    radius?: number;
    width?: number;
    x?: number;
    y?: number;
    frontZ?: number;
    rearZ?: number;
    tyre?: number;
  } = {},
): void {
  const radius = opts.radius ?? 0.3;
  const width = opts.width ?? 0.24;
  const x = opts.x ?? 0.74;
  const y = opts.y ?? radius;
  const frontZ = opts.frontZ ?? -0.82;
  const rearZ = opts.rearZ ?? 0.86;
  const tyreGeo = new CylinderGeometry(radius, radius, width, 16);
  tyreGeo.rotateZ(Math.PI / 2);
  const rimGeo = new TorusGeometry(radius * 0.66, radius * 0.115, 6, 20);
  rimGeo.rotateY(Math.PI / 2);
  for (const [wx, wz] of [
    [-x, frontZ],
    [x, frontZ],
    [-x, rearZ],
    [x, rearZ],
  ]) {
    add(g, new Mesh(tyreGeo, flat(opts.tyre ?? 0x0b0614)), wx, y, wz);
    add(g, new Mesh(rimGeo, flat(paint.rim)), wx * 1.17, y, wz);
  }
}

let radialTexture: CanvasTexture | undefined;

/** Degradado radial blanco reutilizable para sombras y luces de bajos suaves. */
function softRadialTexture(): CanvasTexture {
  if (radialTexture) return radialTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 48);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  radialTexture = new CanvasTexture(canvas);
  return radialTexture;
}

function shadow(g: Group, w = 2.0, l = 3.5): void {
  const mesh = new Mesh(
    new PlaneGeometry(w, l),
    new MeshBasicMaterial({
      map: softRadialTexture(),
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  g.add(mesh);
}

function underglow(g: Group, color: number, w = 1.9, l = 3.2, opacity = 0.35): void {
  const mesh = new Mesh(
    new PlaneGeometry(w, l),
    new MeshBasicMaterial({
      map: softRadialTexture(),
      color,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  g.add(mesh);
}

/** Tres finas franjas horizontales a cada lado, el degradado típico del synthwave. */
function sideStripes(
  g: Group,
  x: number,
  y: number,
  z: number,
  length: number,
  colors: readonly number[],
  thickness = 0.045,
): void {
  colors.forEach((color, i) => {
    box(g, 0.02, thickness, length, color, x, y + i * (thickness + 0.018), z);
  });
}

function roundLight(
  g: Group,
  radius: number,
  color: number,
  x: number,
  y: number,
  z: number,
  axis: 'x' | 'y' | 'z' = 'z',
): Mesh {
  return cyl(g, radius, 0.06, color, x, y, z, axis);
}

function wing(
  g: Group,
  paint: Paint,
  opts: {
    width: number;
    height: number;
    z: number;
    y: number;
    depth?: number;
    uprights?: number;
    color?: number;
  },
): void {
  const depth = opts.depth ?? 0.4;
  const color = opts.color ?? 0x111111;
  const spoiler = box(g, opts.width, 0.06, depth, color, 0, opts.y, opts.z);
  addOutline(g, spoiler, paint.accent, 20);
  const uprightX = opts.uprights ?? opts.width * 0.36;
  for (const x of [-uprightX, uprightX]) {
    box(g, 0.06, opts.height, 0.12, color, x, opts.y - opts.height / 2, opts.z);
  }
}

// ---------------------------------------------------------------------------
// 1-10. Recoloreados del deportivo retro original
// ---------------------------------------------------------------------------

const RETRO_PROFILE: Profile = [
  [-1.32, 0.2],
  [-1.36, 0.56],
  [-1.1, 0.64],
  [-0.42, 0.98],
  [0.2, 0.98],
  [0.82, 0.62],
  [1.36, 0.5],
  [1.4, 0.3],
  [1.26, 0.18],
];

const RETRO_GLASS: Profile = [
  [-0.36, 0.68],
  [-0.32, 0.94],
  [0.16, 0.94],
  [0.66, 0.66],
];

const RETRO_BODY_COLORS: Record<number, number> = {
  1: 0x8a78cf, // Morado original
  2: 0x22ccff, // Cian eléctrico
  3: 0xff2255, // Rosa neón
  4: 0x22ff88, // Verde ácido
  5: 0xffcc00, // Amarillo solar
  6: 0x8822ff, // Púrpura profundo
  7: 0xffffff, // Blanco hielo
  8: 0x111111, // Negro medianoche
  9: 0x4466aa, // Azul marino
  10: 0xff8800, // Naranja atardecer
};

function retroVariant(bodyColor: number): Group {
  const paint: Paint = {
    body: bodyColor,
    accent: 0xff4fd8,
    rim: 0x2de2e6,
    glass: 0x120630,
    glow: 0x2de2e6,
    head: 0xfff6c8,
    tail: 0xff2a6d,
  };
  const g = new Group();
  shadow(g);
  body(g, RETRO_PROFILE, paint, 1.46, 0.05);
  canopy(g, RETRO_GLASS, 1.5, paint, 0.02);

  // Piloto trasero corrido y faros escamoteables, como el coche del juego.
  box(g, 1.36, 0.12, 0.05, paint.tail, 0, 0.46, 1.4);
  for (const x of [-0.45, 0.45]) {
    box(g, 0.34, 0.08, 0.22, paint.head, x, 0.56, -1.12);
  }

  wheels(g, paint);
  underglow(g, paint.glow);
  return g;
}

// ---------------------------------------------------------------------------
// 11. Comet GT: deportivo de homologación, ancho y con alerón de competición
// ---------------------------------------------------------------------------

const COMET_PROFILE: Profile = [
  [-1.38, 0.18],
  [-1.42, 0.62],
  [-1.12, 0.76],
  [-0.55, 1.0],
  [0.05, 1.0],
  [0.55, 0.72],
  [1.05, 0.58],
  [1.45, 0.5],
  [1.5, 0.3],
  [1.35, 0.15],
];

const COMET_GLASS: Profile = [
  [-0.5, 0.76],
  [-0.45, 0.98],
  [0.05, 0.98],
  [0.55, 0.7],
];

function cometGt(): Group {
  const paint: Paint = {
    body: 0xff6a00,
    accent: 0xffd319,
    rim: 0xffd319,
    glass: 0x160b2e,
    glow: 0xff6a00,
    head: 0xfff0b0,
    tail: 0xff2244,
  };
  const g = new Group();
  shadow(g, 2.0, 3.5);
  body(g, COMET_PROFILE, paint, 1.56, 0.06);
  canopy(g, COMET_GLASS, 1.6, paint, 0.02);

  // Splitter, paragolpes y toma de aire del capó.
  box(g, 1.55, 0.05, 0.35, 0x111111, 0, 0.12, -1.52);
  box(g, 1.58, 0.14, 0.16, 0xd94f00, 0, 0.28, -1.48);
  box(g, 0.55, 0.1, 0.45, 0x111111, 0, 0.7, -0.75);

  // Ensanche de aletas en las cuatro ruedas.
  for (const x of [-0.81, 0.81]) {
    for (const z of [-0.82, 0.9]) {
      box(g, 0.1, 0.28, 0.75, 0xd94f00, x, 0.4, z);
    }
  }

  // Cuatro faros redondos y alerón trasero.
  for (const x of [-0.65, -0.45, 0.45, 0.65]) {
    roundLight(g, 0.1, paint.head, x, 0.52, -1.46);
  }
  wing(g, paint, { width: 1.72, height: 0.38, z: 1.33, y: 1.04, depth: 0.38, uprights: 0.62 });

  // Pilotos y escapes.
  for (const x of [-0.48, 0.48]) {
    box(g, 0.42, 0.12, 0.04, paint.tail, x, 0.5, 1.46);
  }
  for (const x of [-0.3, 0.3]) {
    cyl(g, 0.07, 0.12, 0x333333, x, 0.24, 1.5, 'z');
  }

  sideStripes(g, -0.8, 0.4, 0, 1.9, [paint.accent]);
  sideStripes(g, 0.8, 0.4, 0, 1.9, [paint.accent]);
  wheels(g, paint);
  underglow(g, paint.glow);
  return g;
}

// ---------------------------------------------------------------------------
// 12. Night Shade: muscle car negro con neón violeta y escapes laterales
// ---------------------------------------------------------------------------

const SHADE_PROFILE: Profile = [
  [-1.5, 0.2],
  [-1.52, 0.55],
  [-1.25, 0.66],
  [-0.55, 0.92],
  [0.05, 0.92],
  [0.45, 0.66],
  [0.95, 0.6],
  [1.35, 0.58],
  [1.56, 0.44],
  [1.5, 0.24],
  [1.3, 0.18],
];

const SHADE_GLASS: Profile = [
  [-0.55, 0.66],
  [-0.45, 0.9],
  [0.05, 0.9],
  [0.5, 0.68],
];

function nightShade(): Group {
  const paint: Paint = {
    body: 0x15121f,
    accent: 0xb14dff,
    rim: 0xb14dff,
    glass: 0x07040d,
    glow: 0x7a2cff,
    head: 0xcfe8ff,
    tail: 0xff2a6d,
  };
  const g = new Group();
  shadow(g, 2.0, 3.5);
  body(g, SHADE_PROFILE, paint, 1.5, 0.05);
  canopy(g, SHADE_GLASS, 1.54, paint, 0.02);

  // Capó abultado y parrilla con lamas verticales.
  box(g, 0.5, 0.14, 0.6, 0x09070f, 0, 0.68, -0.75);
  box(g, 0.42, 0.02, 0.5, paint.accent, 0, 0.76, -0.75);
  box(g, 1.25, 0.2, 0.08, 0x050308, 0, 0.38, -1.5);
  for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) {
    box(g, 0.04, 0.16, 0.03, 0x6a2a99, x, 0.38, -1.55);
  }

  for (const x of [-0.55, -0.35, 0.35, 0.55]) {
    roundLight(g, 0.09, paint.head, x, 0.5, -1.56);
  }

  // Escapes laterales y lamas sobre la luna trasera.
  for (const x of [-0.81, 0.81]) {
    cyl(g, 0.055, 0.45, 0x2a2530, x, 0.24, 0.5, 'z');
  }
  for (const z of [0.62, 0.76, 0.9, 1.04]) {
    box(g, 1.3, 0.03, 0.12, 0x09070f, 0, 0.78, z);
  }

  // Ducktail apoyado en el borde del portón y piloto corrido por fuera del cuerpo.
  const duck = box(g, 1.5, 0.07, 0.34, paint.body, 0, 0.63, 1.48);
  addOutline(g, duck, paint.accent, 20);
  box(g, 1.42, 0.11, 0.05, paint.tail, 0, 0.45, 1.55);
  box(g, 1.2, 0.18, 0.06, 0x050308, 0, 0.28, 1.53);
  sideStripes(g, -0.8, 0.35, 0, 2.2, [paint.accent]);
  sideStripes(g, 0.8, 0.35, 0, 2.2, [paint.accent]);
  wheels(g, paint);
  underglow(g, paint.glow);
  return g;
}

// ---------------------------------------------------------------------------
// 13. Mirage Turbo: rally de grupo B, blanco con faros en el techo
// ---------------------------------------------------------------------------

const MIRAGE_PROFILE: Profile = [
  [-1.35, 0.2],
  [-1.42, 0.78],
  [-1.28, 0.98],
  [-0.85, 1.06],
  [-0.15, 1.06],
  [0.35, 0.88],
  [0.9, 0.62],
  [1.32, 0.52],
  [1.4, 0.3],
  [1.22, 0.18],
];

const MIRAGE_GLASS: Profile = [
  [-1.0, 0.82],
  [-0.9, 1.04],
  [-0.2, 1.04],
  [0.3, 0.86],
];

function mirageTurbo(): Group {
  const paint: Paint = {
    body: 0xf2f2f8,
    accent: 0x2de2e6,
    rim: 0x2de2e6,
    glass: 0x0d1b2a,
    glow: 0x2de2e6,
    head: 0xfff6c8,
    tail: 0xff2244,
  };
  const g = new Group();
  shadow(g, 1.95, 3.3);
  body(g, MIRAGE_PROFILE, paint, 1.5, 0.05);
  canopy(g, MIRAGE_GLASS, 1.54, paint, 0.02);

  // Aletas anchas de rally.
  for (const x of [-0.8, 0.8]) {
    for (const z of [-0.85, 0.9]) {
      box(g, 0.12, 0.3, 0.7, paint.body, x, 0.45, z);
    }
  }

  // Toma de aire y barra de luces en el techo.
  box(g, 0.42, 0.12, 0.5, 0x111111, 0, 1.1, 0);
  box(g, 1.0, 0.08, 0.2, 0x111111, 0, 1.18, -0.35);
  for (const x of [-0.36, -0.12, 0.12, 0.36]) {
    roundLight(g, 0.09, paint.head, x, 1.24, -0.4);
  }

  // Paragolpes, antinieblas y faldones.
  box(g, 1.5, 0.16, 0.16, 0x111111, 0, 0.3, -1.4);
  for (const x of [-0.5, 0.5]) {
    roundLight(g, 0.08, paint.head, x, 0.32, -1.48);
  }
  for (const x of [-0.8, 0.8]) {
    for (const z of [-0.55, 1.22]) {
      box(g, 0.28, 0.25, 0.05, 0x111111, x, 0.12, z);
    }
  }

  wing(g, paint, {
    width: 1.7,
    height: 0.5,
    z: 1.3,
    y: 1.1,
    depth: 0.4,
    uprights: 0.6,
    color: paint.body,
  });
  for (const x of [-0.45, 0.45]) {
    box(g, 0.35, 0.12, 0.05, paint.tail, x, 0.5, 1.45);
  }

  sideStripes(g, -0.79, 0.45, 0, 2.2, [0xff2244, paint.accent]);
  sideStripes(g, 0.79, 0.45, 0, 2.2, [0xff2244, paint.accent]);
  wheels(g, paint);
  underglow(g, paint.glow);
  return g;
}

// ---------------------------------------------------------------------------
// 14. Vortex LM: prototipo de resistencia, bajo, con aleta de tiburón
// ---------------------------------------------------------------------------

const VORTEX_PROFILE: Profile = [
  [-1.55, 0.14],
  [-1.52, 0.36],
  [-1.05, 0.55],
  [-0.4, 0.76],
  [0.15, 0.76],
  [0.55, 0.52],
  [1.15, 0.36],
  [1.6, 0.3],
  [1.68, 0.18],
  [1.5, 0.1],
];

const VORTEX_GLASS: Profile = [
  [-0.55, 0.56],
  [-0.45, 0.78],
  [0.15, 0.78],
  [0.55, 0.52],
];

function vortexLm(): Group {
  const paint: Paint = {
    body: 0x0a1a3a,
    accent: 0x00f0ff,
    rim: 0x00f0ff,
    glass: 0x061020,
    glow: 0x00f0ff,
    head: 0xd8fbff,
    tail: 0xff2a6d,
  };
  const g = new Group();
  shadow(g, 2.0, 3.6);
  body(g, VORTEX_PROFILE, paint, 1.6, 0.05);
  canopy(g, VORTEX_GLASS, 0.95, paint, 0.02);

  // Pontones laterales y aleta de tiburón.
  for (const x of [-0.72, 0.72]) {
    const pod = box(g, 0.35, 0.24, 1.3, paint.body, x, 0.38, 0.15);
    addOutline(g, pod, paint.accent, 20);
  }
  const fin = box(g, 0.05, 0.5, 1.25, paint.body, 0, 0.92, 0.55);
  addOutline(g, fin, paint.accent, 20);

  // Alerón enorme con endplates.
  wing(g, paint, { width: 1.85, height: 0.4, z: 1.55, y: 1.02, depth: 0.45, uprights: 0.95 });
  for (const x of [-0.92, 0.92]) {
    const plate = box(g, 0.06, 0.3, 0.5, paint.body, x, 0.92, 1.55);
    addOutline(g, plate, paint.accent, 20);
  }

  box(g, 1.7, 0.05, 0.4, 0x111111, 0, 0.1, -1.55);
  for (const x of [-0.78, 0.78]) {
    box(g, 0.06, 0.25, 0.04, paint.accent, x, 0.4, -1.55);
  }
  for (const x of [-0.5, 0.5]) {
    box(g, 0.3, 0.06, 0.03, paint.head, x, 0.36, -1.63);
  }
  for (const x of [-0.12, 0.12]) {
    cyl(g, 0.07, 0.1, 0x333333, x, 0.24, 1.55, 'z');
  }
  // Barra de pilotos en el borde del portón.
  box(g, 1.4, 0.07, 0.04, paint.tail, 0, 0.3, 1.57);
  box(g, 1.4, 0.03, 0.04, paint.accent, 0, 0.24, 1.57);

  wheels(g, paint);
  underglow(g, paint.glow, 1.9, 3.3, 0.25);
  return g;
}

// ---------------------------------------------------------------------------
// 15. Sunset Van: furgoneta de los 80 con franjas de atardecer
// ---------------------------------------------------------------------------

const VAN_PROFILE: Profile = [
  [-1.35, 0.2],
  [-1.42, 1.02],
  [-1.28, 1.12],
  [-0.3, 1.12],
  [0.25, 1.08],
  [0.65, 0.92],
  [1.05, 0.72],
  [1.35, 0.52],
  [1.42, 0.3],
  [1.25, 0.18],
];

const VAN_GLASS: Profile = [
  [-1.05, 0.74],
  [-1.0, 1.06],
  [-0.25, 1.06],
  [0.15, 0.88],
];

function sunsetVan(): Group {
  const paint: Paint = {
    body: 0xf5e6c8,
    accent: 0xff4fd8,
    rim: 0xff4fd8,
    glass: 0x140a20,
    glow: 0xff4fd8,
    head: 0xfff6c8,
    tail: 0xff2a6d,
  };
  const g = new Group();
  shadow(g, 2.0, 3.4);
  body(g, VAN_PROFILE, paint, 1.58, 0.05);
  canopy(g, VAN_GLASS, 1.62, paint, 0.02);

  // Pilares que rompen la banda de lunas.
  for (const x of [-0.81, 0.81]) {
    for (const z of [0.35, 0.0, -0.35]) {
      box(g, 0.04, 0.36, 0.08, paint.body, x, 0.9, z);
    }
  }

  // Franjas del atardecer en los costados.
  for (const x of [-0.81, 0.81]) {
    sideStripes(g, x, 0.52, 0.1, 2.2, [0xff8800, 0xff4fd8, 0x7a2cff]);
  }

  // Baca del techo con patas para que no parezca flotar.
  for (const x of [-0.55, 0.55]) {
    box(g, 0.05, 0.05, 2.2, 0x111111, x, 1.2, 0.05);
    for (const z of [-0.7, 0.7]) {
      box(g, 0.04, 0.1, 0.04, 0x111111, x, 1.15, z);
    }
  }
  for (const z of [-0.6, 0.6]) {
    box(g, 1.2, 0.05, 0.05, 0x111111, 0, 1.2, z);
  }

  // Parrilla, faros redondos y paragolpes pegados al morro inclinado.
  box(g, 1.2, 0.2, 0.06, 0x111111, 0, 0.42, -1.42);
  for (const x of [-0.55, 0.55]) {
    roundLight(g, 0.11, paint.head, x, 0.56, -1.33);
  }
  box(g, 1.5, 0.15, 0.15, 0x111111, 0, 0.25, -1.45);

  // Escalera trasera y piloto corrido.
  for (const y of [0.5, 0.75, 1.0]) {
    box(g, 0.35, 0.04, 0.04, 0x333333, 0.5, y, 1.46);
  }
  for (const x of [0.32, 0.68]) {
    box(g, 0.05, 0.8, 0.05, 0x333333, x, 0.75, 1.46);
  }
  box(g, 1.2, 0.1, 0.04, paint.tail, 0, 0.55, 1.45);

  wheels(g, paint);
  underglow(g, paint.glow);
  return g;
}

// ---------------------------------------------------------------------------
// 16. Outlaw 4x4: pickup cuadrado, elevado y con barra antivuelco
// ---------------------------------------------------------------------------

const OUTLAW_PROFILE: Profile = [
  [-1.45, 0.25],
  [-1.5, 0.92],
  [-1.3, 1.0],
  [-0.3, 1.0],
  [0.1, 0.92],
  [0.35, 0.72],
  [0.85, 0.66],
  [1.3, 0.6],
  [1.45, 0.48],
  [1.45, 0.3],
  [1.3, 0.22],
];

const OUTLAW_GLASS: Profile = [
  [-0.45, 0.72],
  [-0.4, 0.98],
  [0.05, 0.98],
  [0.45, 0.72],
];

function outlaw4x4(): Group {
  const paint: Paint = {
    body: 0x2e5a3a,
    accent: 0xffb000,
    rim: 0xffb000,
    glass: 0x0d1b16,
    glow: 0xffb000,
    head: 0xfff2b0,
    tail: 0xff3322,
  };
  const g = new Group();
  shadow(g, 2.05, 3.5);

  // La carrocería va elevada para dejar ver las ruedas de campo.
  const chassis = new Group();
  chassis.position.y = 0.1;
  g.add(chassis);
  body(chassis, OUTLAW_PROFILE, paint, 1.6, 0.05);
  canopy(chassis, OUTLAW_GLASS, 1.63, paint, 0.02);

  // Caja abierta con barras laterales.
  box(chassis, 1.4, 0.05, 0.9, 0x111111, 0, 0.72, 1.05);
  for (const x of [-0.75, 0.75]) {
    box(chassis, 0.08, 0.25, 0.9, paint.body, x, 0.85, 1.05);
  }
  box(chassis, 1.5, 0.25, 0.06, paint.body, 0, 0.85, 1.55);
  box(chassis, 1.3, 0.03, 0.03, paint.accent, 0, 0.98, 1.54);

  // Barra antivuelco y focos auxiliares.
  for (const x of [-0.55, 0.55]) {
    box(chassis, 0.08, 0.4, 0.08, 0x111111, x, 1.15, 0.55);
  }
  box(chassis, 1.2, 0.08, 0.08, 0x111111, 0, 1.35, 0.55);
  for (const x of [-0.45, -0.15, 0.15, 0.45]) {
    roundLight(chassis, 0.08, paint.head, x, 1.42, 0.55);
  }

  // Defensa delantera y estribos.
  for (const x of [-0.5, 0, 0.5]) {
    box(chassis, 0.06, 0.4, 0.06, 0x111111, x, 0.4, -1.55);
  }
  for (const y of [0.3, 0.55]) {
    box(chassis, 1.2, 0.06, 0.06, 0x111111, 0, y, -1.55);
  }
  // Faros delanteros sobre la defensa.
  for (const x of [-0.62, 0.62]) {
    roundLight(chassis, 0.1, paint.head, x, 0.46, -1.48);
  }
  for (const x of [-0.88, 0.88]) {
    box(chassis, 0.15, 0.05, 1.6, 0x111111, x, 0.3, 0.1);
  }

  box(chassis, 0.5, 0.12, 0.5, 0x111111, 0, 0.78, -0.8);
  for (const x of [-0.55, 0.55]) {
    box(chassis, 0.25, 0.18, 0.04, paint.tail, x, 0.55, 1.58);
  }

  wheels(g, paint, { radius: 0.38, width: 0.3, x: 0.8, y: 0.38, frontZ: -0.85, rearZ: 0.95 });
  underglow(g, paint.glow, 2.0, 3.4);
  return g;
}

// ---------------------------------------------------------------------------
// 17. Venom '88: hiperdeportivo en cuña con alerón y escapes cuádruples
// ---------------------------------------------------------------------------

const VENOM_PROFILE: Profile = [
  [-1.45, 0.16],
  [-1.5, 0.52],
  [-1.2, 0.68],
  [-0.5, 0.88],
  [0.1, 0.88],
  [0.55, 0.62],
  [1.15, 0.45],
  [1.55, 0.35],
  [1.62, 0.2],
  [1.45, 0.12],
];

const VENOM_GLASS: Profile = [
  [-0.55, 0.64],
  [-0.5, 0.88],
  [0.0, 0.88],
  [0.45, 0.62],
];

function venom88(): Group {
  const paint: Paint = {
    body: 0xff2255,
    accent: 0xfff200,
    rim: 0xfff200,
    glass: 0x1a0610,
    glow: 0xfff200,
    head: 0xfff6c8,
    tail: 0xff2a6d,
  };
  const g = new Group();
  shadow(g, 2.0, 3.5);
  body(g, VENOM_PROFILE, paint, 1.56, 0.05);
  canopy(g, VENOM_GLASS, 1.6, paint, 0.02);

  // Tomas laterales con lamas.
  for (const x of [-0.8, 0.8]) {
    const intake = box(g, 0.22, 0.3, 0.8, 0x111111, x, 0.45, 0.35);
    addOutline(g, intake, paint.accent, 20);
    for (const y of [0.38, 0.45, 0.52]) {
      box(g, 0.02, 0.03, 0.7, paint.accent, x * 1.01, y, 0.35);
    }
  }

  wing(g, paint, { width: 1.85, height: 0.4, z: 1.45, y: 1.0, depth: 0.45, uprights: 0.9 });
  for (const x of [-0.92, 0.92]) {
    box(g, 0.06, 0.3, 0.5, paint.body, x, 0.9, 1.45);
  }

  // Faros escamoteables abiertos y splitter.
  for (const x of [-0.45, 0.45]) {
    const pod = box(g, 0.4, 0.16, 0.3, paint.body, x, 0.5, -1.18);
    addOutline(g, pod, paint.accent, 20);
    box(g, 0.32, 0.1, 0.03, paint.head, x, 0.5, -1.34);
  }
  box(g, 1.6, 0.05, 0.35, 0x111111, 0, 0.1, -1.55);

  for (const x of [-0.3, -0.1, 0.1, 0.3]) {
    cyl(g, 0.06, 0.1, 0x333333, x, 0.28, 1.5, 'z');
  }
  box(g, 1.4, 0.1, 0.05, paint.tail, 0, 0.48, 1.52);
  sideStripes(g, -0.79, 0.5, 0, 2.0, [paint.accent]);
  sideStripes(g, 0.79, 0.5, 0, 2.0, [paint.accent]);
  wheels(g, paint);
  underglow(g, paint.glow, 1.9, 3.2, 0.3);
  return g;
}

// ---------------------------------------------------------------------------
// 18. Chrome Drift: coupé JDM plateado, ensanchado y con alerón GT
// ---------------------------------------------------------------------------

const DRIFT_PROFILE: Profile = [
  [-1.4, 0.18],
  [-1.45, 0.55],
  [-1.15, 0.65],
  [-0.5, 0.95],
  [0.15, 0.95],
  [0.6, 0.7],
  [1.15, 0.55],
  [1.45, 0.45],
  [1.48, 0.28],
  [1.3, 0.16],
];

const DRIFT_GLASS: Profile = [
  [-0.5, 0.7],
  [-0.45, 0.94],
  [0.05, 0.94],
  [0.5, 0.72],
];

function chromeDrift(): Group {
  const paint: Paint = {
    body: 0xc0c6d0,
    accent: 0xff4fd8,
    rim: 0xff4fd8,
    glass: 0x101018,
    glow: 0xff4fd8,
    head: 0xffffff,
    tail: 0xff2244,
  };
  const g = new Group();
  shadow(g, 2.0, 3.5);
  body(g, DRIFT_PROFILE, paint, 1.58, 0.05);
  canopy(g, DRIFT_GLASS, 1.62, paint, 0.02);

  // Capó negro y aletas anchas.
  box(g, 1.3, 0.04, 0.8, 0x111111, 0, 0.62, -0.75);
  for (const x of [-0.82, 0.82]) {
    for (const z of [-0.85, 0.9]) {
      box(g, 0.14, 0.28, 0.8, paint.body, x, 0.42, z);
    }
  }

  // Alerón GT, faldones e intercooler.
  wing(g, paint, { width: 1.75, height: 0.45, z: 1.3, y: 1.1, depth: 0.42, uprights: 0.65 });
  for (const x of [-0.8, 0.8]) {
    box(g, 0.08, 0.08, 1.8, 0x111111, x, 0.18, 0);
  }
  // Morro: parrilla, intercooler y faros rectangulares.
  box(g, 1.3, 0.22, 0.07, 0x111111, 0, 0.36, -1.47);
  box(g, 0.7, 0.16, 0.05, 0xb0b6c0, 0, 0.35, -1.51);
  for (const y of [0.29, 0.33, 0.37, 0.41]) {
    box(g, 0.66, 0.015, 0.02, 0x555555, 0, y, -1.54);
  }
  for (const x of [-0.55, 0.55]) {
    box(g, 0.38, 0.09, 0.04, paint.head, x, 0.38, -1.5);
  }
  box(g, 0.08, 0.08, 0.2, 0xff2a2a, 0.62, 0.24, -1.49);

  // Paño trasero negro con los pilotos redondos bien fuera del volumen.
  box(g, 1.3, 0.2, 0.05, 0x111111, 0, 0.36, 1.46);
  for (const x of [-0.45, 0.45]) {
    roundLight(g, 0.11, paint.tail, x, 0.42, 1.49);
  }
  cyl(g, 0.1, 0.12, 0x333333, 0, 0.28, 1.49, 'z');
  sideStripes(g, -0.8, 0.45, 0, 2.0, [paint.accent]);
  sideStripes(g, 0.8, 0.45, 0, 2.0, [paint.accent]);
  wheels(g, paint);
  underglow(g, paint.glow);
  return g;
}

// ---------------------------------------------------------------------------
// 19. Moon Runner: shooting brake largo, con baca y piloto corrido
// ---------------------------------------------------------------------------

const MOON_PROFILE: Profile = [
  [-1.45, 0.2],
  [-1.5, 0.8],
  [-1.4, 1.0],
  [-0.9, 1.06],
  [-0.1, 1.06],
  [0.35, 0.94],
  [0.9, 0.66],
  [1.35, 0.5],
  [1.4, 0.3],
  [1.25, 0.18],
];

const MOON_GLASS: Profile = [
  [-1.15, 0.78],
  [-1.05, 1.04],
  [-0.2, 1.04],
  [0.3, 0.9],
];

function moonRunner(): Group {
  const paint: Paint = {
    body: 0x3a2a6a,
    accent: 0x2de2e6,
    rim: 0x2de2e6,
    glass: 0x0a0614,
    glow: 0x2de2e6,
    head: 0xfff6c8,
    tail: 0xff2a6d,
  };
  const g = new Group();
  shadow(g, 2.0, 3.5);
  body(g, MOON_PROFILE, paint, 1.54, 0.05);
  canopy(g, MOON_GLASS, 1.58, paint, 0.02);

  // Baca y lamas sobre la luna trasera.
  for (const x of [-0.55, 0.55]) {
    box(g, 0.05, 0.05, 2.0, 0x111111, x, 1.12, 0);
  }
  for (const z of [-0.5, 0.5]) {
    box(g, 1.1, 0.05, 0.05, 0x111111, 0, 1.12, z);
  }
  // Lamas de neón sobre la luna trasera.
  for (const [y, z] of [
    [1.09, 1.07],
    [1.01, 1.1],
    [0.93, 1.13],
  ]) {
    box(g, 1.1, 0.025, 0.05, paint.accent, 0, y, z);
  }

  // Piloto corrido y escapes.
  box(g, 1.4, 0.08, 0.04, paint.tail, 0, 0.52, 1.52);
  box(g, 1.4, 0.03, 0.04, paint.accent, 0, 0.46, 1.52);
  for (const x of [-0.35, 0.35]) {
    cyl(g, 0.07, 0.1, 0x333333, x, 0.25, 1.53, 'z');
  }

  // Parrilla y cuatro faros redondos pegados al morro.
  box(g, 1.1, 0.2, 0.06, 0x111111, 0, 0.4, -1.36);
  for (const x of [-0.55, -0.35, 0.35, 0.55]) {
    roundLight(g, 0.08, paint.head, x, 0.48, -1.4);
  }

  box(g, 1.4, 0.06, 0.3, paint.body, 0, 1.05, 1.26);
  sideStripes(g, -0.79, 0.45, 0, 2.2, [0x7a2cff, paint.accent]);
  sideStripes(g, 0.79, 0.45, 0, 2.2, [0x7a2cff, paint.accent]);
  wheels(g, paint);
  underglow(g, paint.glow);
  return g;
}

// ---------------------------------------------------------------------------
// 20. Solaris X: concept car dorado, con cabina de burbuja y aletas
// ---------------------------------------------------------------------------

const SOLARIS_PROFILE: Profile = [
  [-1.5, 0.14],
  [-1.55, 0.44],
  [-1.2, 0.62],
  [-0.4, 0.9],
  [0.2, 0.9],
  [0.65, 0.6],
  [1.25, 0.4],
  [1.6, 0.28],
  [1.65, 0.15],
  [1.45, 0.1],
];

const SOLARIS_GLASS: Profile = [
  [-0.6, 0.6],
  [-0.5, 0.88],
  [0.1, 0.88],
  [0.6, 0.55],
];

function solarisX(): Group {
  const paint: Paint = {
    body: 0xffd319,
    accent: 0xff4fd8,
    rim: 0xff4fd8,
    glass: 0x1a0a20,
    glow: 0xff4fd8,
    head: 0xd8fbff,
    tail: 0xff2a6d,
  };
  const g = new Group();
  shadow(g, 2.0, 3.5);
  body(g, SOLARIS_PROFILE, paint, 1.5, 0.05);
  canopy(g, SOLARIS_GLASS, 1.2, paint, 0.02);

  // Aletas triangulares traseras.
  for (const x of [-0.68, 0.68]) {
    const finShape = shape([
      [0, 0],
      [0.7, 0],
      [0.25, 0.5],
    ]);
    const finGeo = new ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false });
    finGeo.translate(0, 0, -0.03);
    finGeo.rotateY(-Math.PI / 2);
    const fin = new Mesh(finGeo, flat(paint.body));
    fin.position.set(x, 0.45, 0.95);
    g.add(fin);
    addOutline(g, fin, paint.accent, 20);
  }

  // Barra de luz frontal y piloto trasero.
  box(g, 1.4, 0.06, 0.04, paint.head, 0, 0.39, -1.58);
  box(g, 1.4, 0.08, 0.04, paint.tail, 0, 0.43, 1.57);
  box(g, 1.4, 0.03, 0.04, paint.accent, 0, 0.36, 1.57);

  // Canards delanteros y línea de neón lateral.
  for (const x of [-0.7, 0.7]) {
    box(g, 0.25, 0.02, 0.15, 0x111111, x, 0.2, -1.45);
  }
  sideStripes(g, -0.79, 0.45, 0, 2.2, [paint.accent]);
  sideStripes(g, 0.79, 0.45, 0, 2.2, [paint.accent]);

  wheels(g, paint);
  // Tapas de turbina sobre las llantas.
  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.82, 0.86]) {
      cyl(g, 0.24, 0.03, 0x222222, x, 0.3, z, 'x');
      const ringGeo = new TorusGeometry(0.2, 0.02, 6, 20);
      ringGeo.rotateY(Math.PI / 2);
      add(g, new Mesh(ringGeo, flat(paint.accent)), x, 0.3, z);
    }
  }
  underglow(g, paint.glow, 1.9, 3.2, 0.3);
  return g;
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export function buildMockupCar(id: number): Group {
  if (id >= 1 && id <= 10) return retroVariant(RETRO_BODY_COLORS[id] ?? RETRO_BODY_COLORS[1]);

  switch (id) {
    case 11:
      return cometGt();
    case 12:
      return nightShade();
    case 13:
      return mirageTurbo();
    case 14:
      return vortexLm();
    case 15:
      return sunsetVan();
    case 16:
      return outlaw4x4();
    case 17:
      return venom88();
    case 18:
      return chromeDrift();
    case 19:
      return moonRunner();
    case 20:
      return solarisX();
    default:
      return retroVariant(RETRO_BODY_COLORS[1]);
  }
}
