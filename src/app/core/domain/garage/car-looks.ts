/**
 * Forma y colores de cada coche del garaje. Los comparten la escena 3D (`garage-cars.ts`) y las
 * siluetas de la ruleta del cubo azul, para que sean siempre el mismo coche.
 * Perfil lateral en metros: el morro mira a x+.
 */

export type CarProfile = readonly (readonly [number, number])[];

export interface CarLook {
  readonly profile: CarProfile;
  readonly glass: CarProfile;
  /** Pintura y neón de la versión dibujada en la ruleta. */
  readonly body: string;
  readonly accent: string;
}

export const RETRO_PROFILE: CarProfile = [
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

export const RETRO_GLASS: CarProfile = [
  [-0.36, 0.68],
  [-0.32, 0.94],
  [0.16, 0.94],
  [0.66, 0.66],
];

export const COMET_PROFILE: CarProfile = [
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

export const COMET_GLASS: CarProfile = [
  [-0.5, 0.76],
  [-0.45, 0.98],
  [0.05, 0.98],
  [0.55, 0.7],
];

export const SHADE_PROFILE: CarProfile = [
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

export const SHADE_GLASS: CarProfile = [
  [-0.55, 0.66],
  [-0.45, 0.9],
  [0.05, 0.9],
  [0.5, 0.68],
];

export const MIRAGE_PROFILE: CarProfile = [
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

export const MIRAGE_GLASS: CarProfile = [
  [-1.0, 0.8],
  [-0.9, 0.97],
  [-0.2, 0.97],
  [0.3, 0.84],
];

export const VORTEX_PROFILE: CarProfile = [
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

export const VORTEX_GLASS: CarProfile = [
  [-0.55, 0.56],
  [-0.45, 0.78],
  [0.15, 0.78],
  [0.55, 0.52],
];

export const VAN_PROFILE: CarProfile = [
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

export const VAN_GLASS: CarProfile = [
  [-1.05, 0.74],
  [-1.0, 0.98],
  [-0.25, 0.98],
  [0.15, 0.86],
];

export const OUTLAW_PROFILE: CarProfile = [
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

export const OUTLAW_GLASS: CarProfile = [
  [-0.45, 0.72],
  [-0.4, 0.98],
  [0.05, 0.98],
  [0.45, 0.72],
];

export const VENOM_PROFILE: CarProfile = [
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

export const VENOM_GLASS: CarProfile = [
  [-0.55, 0.64],
  [-0.5, 0.88],
  [0.0, 0.88],
  [0.45, 0.62],
];

export const DRIFT_PROFILE: CarProfile = [
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

export const DRIFT_GLASS: CarProfile = [
  [-0.5, 0.7],
  [-0.45, 0.94],
  [0.05, 0.94],
  [0.5, 0.72],
];

export const MOON_PROFILE: CarProfile = [
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

export const MOON_GLASS: CarProfile = [
  [-1.15, 0.78],
  [-1.05, 1.04],
  [-0.2, 1.04],
  [0.3, 0.9],
];

export const SOLARIS_PROFILE: CarProfile = [
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

export const SOLARIS_GLASS: CarProfile = [
  [-0.6, 0.6],
  [-0.5, 0.88],
  [0.1, 0.88],
  [0.6, 0.55],
];

export const RETRO_BODY_COLORS: Record<number, number> = {
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

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

const retro = (id: number, accent: string): CarLook => ({
  profile: RETRO_PROFILE,
  glass: RETRO_GLASS,
  body: hex(RETRO_BODY_COLORS[id]),
  accent,
});

const CAR_LOOKS: Readonly<Record<number, CarLook>> = {
  1: retro(1, '#2de2e6'),
  2: retro(2, '#f4ecff'),
  3: retro(3, '#2de2e6'),
  4: retro(4, '#ff4fd8'),
  5: retro(5, '#ff4fd8'),
  6: retro(6, '#2de2e6'),
  7: retro(7, '#2de2e6'),
  8: retro(8, '#ff4fd8'),
  9: retro(9, '#2de2e6'),
  10: retro(10, '#ffd319'),
  11: { profile: COMET_PROFILE, glass: COMET_GLASS, body: '#ff6a00', accent: '#ffd319' },
  12: { profile: SHADE_PROFILE, glass: SHADE_GLASS, body: '#15121f', accent: '#b14dff' },
  13: { profile: MIRAGE_PROFILE, glass: MIRAGE_GLASS, body: '#f2f2f8', accent: '#2de2e6' },
  14: { profile: VORTEX_PROFILE, glass: VORTEX_GLASS, body: '#0a1a3a', accent: '#00f0ff' },
  15: { profile: VAN_PROFILE, glass: VAN_GLASS, body: '#f5e6c8', accent: '#ff4fd8' },
  16: { profile: OUTLAW_PROFILE, glass: OUTLAW_GLASS, body: '#2e5a3a', accent: '#ffb000' },
  17: { profile: VENOM_PROFILE, glass: VENOM_GLASS, body: '#ff2255', accent: '#fff200' },
  18: { profile: DRIFT_PROFILE, glass: DRIFT_GLASS, body: '#c0c6d0', accent: '#ff4fd8' },
  19: { profile: MOON_PROFILE, glass: MOON_GLASS, body: '#3a2a6a', accent: '#2de2e6' },
  20: { profile: SOLARIS_PROFILE, glass: SOLARIS_GLASS, body: '#ffd319', accent: '#ff4fd8' },
};

export function carLook(id: number): CarLook {
  return CAR_LOOKS[id] ?? CAR_LOOKS[1];
}

/** Color de cada efecto en la ruleta: el que domina en la carrera. */
const FX_ACCENTS: Readonly<Record<number, string>> = {
  1: '#ff901f',
  2: '#ffd319',
  3: '#2de2e6',
  4: '#ff4fd8',
  5: '#ff901f',
  6: '#2de2e6',
  7: '#ffd319',
  8: '#f4ecff',
  9: '#5dff9a',
  10: '#9fe8ff',
};

export function fxAccent(id: number): string {
  return FX_ACCENTS[id] ?? FX_ACCENTS[1];
}
