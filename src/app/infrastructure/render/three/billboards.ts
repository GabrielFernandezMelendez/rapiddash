import {
  AdditiveBlending,
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { flagEmoji } from '../../../core/domain/profile/country';
import { BillboardContent, BillboardEntry, billboardLegs } from '../../../core/domain/track/billboards';
import { Junction, Track } from '../../../core/domain/track/track';

/** Aspecto de los carteles en cada estética (los textos y datos son los mismos). */
export interface BillboardStyle {
  readonly background: string;
  readonly ink: string;
  readonly muted: string;
  /** Borde del líder y del segundo. */
  readonly gold: string;
  readonly silver: string;
  readonly titleFont: string;
  readonly nameFont: string;
  readonly valueFont: string;
  readonly post: number;
  /** Halo de neón detrás del panel (synthwave). */
  readonly glow: boolean;
  readonly italic: boolean;
}

export const CLASSIC_BILLBOARD: BillboardStyle = {
  background: '#171b21',
  ink: '#ffffff',
  muted: '#9aa3ad',
  gold: '#f3c13a',
  silver: '#9aa3ad',
  titleFont: "700 {px}px 'Saira Condensed', 'Arial Narrow', sans-serif",
  nameFont: "800 {px}px 'Saira Condensed', 'Arial Narrow', sans-serif",
  valueFont: "500 {px}px 'IBM Plex Sans', system-ui, sans-serif",
  post: 0x5c6672,
  glow: false,
  italic: false,
};

export const SYNTH_BILLBOARD: BillboardStyle = {
  background: '#14072e',
  ink: '#ffffff',
  muted: '#c9b6ff',
  gold: '#ffd319',
  silver: '#2de2e6',
  titleFont: "600 {px}px 'Chakra Petch', system-ui, sans-serif",
  nameFont: "400 {px}px 'Audiowide', system-ui, sans-serif",
  valueFont: "600 {px}px 'Chakra Petch', system-ui, sans-serif",
  post: 0x3b1a6e,
  glow: true,
  italic: false,
};

const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

/** Tamaño de cada panel en el mundo (m) y en el canvas (px). */
const LEADER = { w: 10, h: 5, px: 640 } as const;
const SECOND = { w: 6, h: 3, px: 512 } as const;
const GAP = 0.8;
/** Detrás del muro frontal del cruce y por encima del panel de chevrones. */
const BEHIND_WALL = 3;
const BOTTOM = 3.6;

interface Panel {
  readonly canvas: HTMLCanvasElement;
  readonly texture: CanvasTexture;
  readonly group: Group;
  readonly role: 'leader' | 'second';
}

/**
 * Carteles con el 1.º y el 2.º del ranking (o del torneo) detrás de algunos cruces. Se montan
 * vacíos al empezar y se rellenan cuando llegan los datos de la red.
 */
export class LeaderBillboards {
  readonly group = new Group();
  private readonly panels: Panel[] = [];
  private content: BillboardContent | null = null;

  constructor(track: Track, private readonly style: BillboardStyle) {
    for (const index of billboardLegs(track)) {
      const j = track.legs[index].junction;
      if (j) this.build(j);
    }
    this.group.visible = false;
    // Si las fuentes aún no han llegado, se redibuja cuando lleguen
    const fonts = [style.titleFont, style.nameFont, style.valueFont].map((f) => f.replace('{px}', '40'));
    void Promise.all(fonts.map((f) => document.fonts?.load(f).catch(() => undefined))).then(() =>
      this.redraw(),
    );
  }

  set(content: BillboardContent | null): void {
    this.content = content;
    this.redraw();
  }

  private redraw(): void {
    const content = this.content;
    this.group.visible = !!content;
    if (!content) return;
    for (const panel of this.panels) {
      const entry = panel.role === 'leader' ? content.leader : content.second;
      // Sin segundo, su panel no se muestra; sin nadie, el del líder invita a ser el primero
      panel.group.visible = panel.role === 'leader' || !!entry;
      this.draw(panel, panel.role === 'leader' ? content.title : content.secondTitle, entry, content.emptyText);
    }
  }

  private build(j: Junction): void {
    const forward = { x: Math.sin(j.heading), z: -Math.cos(j.heading) };
    const right = { x: Math.cos(j.heading), z: Math.sin(j.heading) };
    const d = j.halfWidth * 2 + BEHIND_WALL;
    const total = LEADER.w + GAP + SECOND.w;
    const place = (size: typeof LEADER | typeof SECOND, lateral: number, role: Panel['role']) => {
      const x = j.x + forward.x * d + right.x * lateral;
      const z = j.z + forward.z * d + right.z * lateral;
      this.panels.push(this.panel(size, role, x, z, j.heading));
    };
    place(LEADER, -total / 2 + LEADER.w / 2, 'leader');
    place(SECOND, total / 2 - SECOND.w / 2, 'second');
  }

  private panel(size: typeof LEADER | typeof SECOND, role: Panel['role'], x: number, z: number, heading: number): Panel {
    const canvas = document.createElement('canvas');
    canvas.width = size.px;
    canvas.height = Math.round((size.px * size.h) / size.w);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    const g = new Group();
    g.position.set(x, 0, z);
    g.rotation.y = -heading;
    const center = BOTTOM + size.h / 2;
    const face = new Mesh(new PlaneGeometry(size.w, size.h), new MeshBasicMaterial({ map: texture }));
    face.position.y = center;
    // Dorso liso: desde el tramo de salida no se ve el texto al revés
    const back = new Mesh(new PlaneGeometry(size.w, size.h), new MeshBasicMaterial({ color: this.style.post }));
    back.position.set(0, center, -0.05);
    back.rotation.y = Math.PI;
    g.add(face, back);
    if (this.style.glow) {
      const glow = new Mesh(
        new PlaneGeometry(size.w + 0.9, size.h + 0.9),
        new MeshBasicMaterial({
          color: role === 'leader' ? this.style.gold : this.style.silver,
          transparent: true,
          opacity: 0.35,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
        }),
      );
      glow.position.set(0, center, -0.08);
      g.add(glow);
    }
    const postMat = new MeshBasicMaterial({ color: this.style.post });
    for (const off of [-size.w * 0.32, size.w * 0.32]) {
      const post = new Mesh(new BoxGeometry(0.22, BOTTOM, 0.22), postMat);
      post.position.set(off, BOTTOM / 2, -0.15);
      g.add(post);
    }
    this.group.add(g);
    return { canvas, texture, group: g, role };
  }

  private draw(panel: Panel, title: string, entry: BillboardEntry | null, emptyText: string): void {
    const c = panel.canvas.getContext('2d');
    if (!c) return;
    const { width: w, height: h } = panel.canvas;
    const s = this.style;
    // El panel del segundo es más pequeño: su texto se agranda un poco para que se lea igual
    const u = (w / 100) * (panel.role === 'leader' ? 1 : 1.15);
    const border = panel.role === 'leader' ? s.gold : s.silver;
    c.clearRect(0, 0, w, h);
    c.fillStyle = s.background;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = border;
    c.lineWidth = u * 2.2;
    c.strokeRect(u * 1.1, u * 1.1, w - u * 2.2, h - u * 2.2);
    const pad = u * 6;
    const font = (tpl: string, px: number) => tpl.replace('{px}', String(Math.round(px)));
    c.textBaseline = 'middle';

    // Encabezado («LÍDER · LIGA DEL VIERNES», «2.º»)
    c.fillStyle = border;
    c.font = font(s.titleFont, u * 8.5);
    fitText(c, title.toUpperCase(), pad, h * 0.2, w - pad * 2);

    if (!entry) {
      c.fillStyle = s.ink;
      c.font = font(s.nameFont, u * 12);
      fitText(c, emptyText, pad, h * 0.58, w - pad * 2);
      panel.texture.needsUpdate = true;
      return;
    }

    // Bandera + apodo, lo más grande que quepa
    const flag = entry.country ? flagEmoji(entry.country) : '🏳️';
    c.font = `${Math.round(u * 15)}px ${EMOJI}`;
    c.fillText(flag, pad, h * 0.52);
    const flagW = c.measureText(flag).width + u * 3;
    c.fillStyle = s.ink;
    c.font = font(s.nameFont, u * 19);
    fitText(c, entry.nickname.toUpperCase(), pad + flagW, h * 0.53, w - pad * 2 - flagW);

    c.fillStyle = s.muted;
    c.font = font(s.valueFont, u * 10.5);
    fitText(c, entry.value, pad, h * 0.82, w - pad * 2);
    panel.texture.needsUpdate = true;
  }
}

/** Escribe el texto encogiéndolo en horizontal si no cabe. */
function fitText(c: CanvasRenderingContext2D, text: string, x: number, y: number, max: number): void {
  const width = c.measureText(text).width;
  if (width <= max) {
    c.fillText(text, x, y);
    return;
  }
  c.save();
  c.translate(x, y);
  c.scale(max / width, 1);
  c.fillText(text, 0, 0);
  c.restore();
}
