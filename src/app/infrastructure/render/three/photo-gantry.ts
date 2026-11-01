import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import { flagEmoji } from '../../../core/domain/profile/country';
import { DistantPhotoSpot, LeaderPhotoContent } from '../../../core/domain/track/billboards';
import { BillboardStyle } from './billboards';

const EMOJI = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
/**
 * Panel de 7 × 8 m escalado ocho veces (56 × 64 m), sobre dos postes, con el borde de abajo a
 * BOTTOM (más alto que la cámara, 9,2 m: siempre por encima del horizonte) y curvado hacia el que
 * llega (RADIUS en metros sin escalar), como una pantalla de estadio.
 */
const W = 7;
const H = 8;
const SCALE = 8;
const BOTTOM = 12;
const RADIUS = 6;
const PX = 560;
const PH = 640;
/** Bombillas del borde LED (estética futurista) y vueltas de color por segundo. */
const LEDS_PER_SIDE = { x: 14, y: 16 };
const LED_SPEED = 0.25;

/**
 * Cartel con la foto del líder del torneo, enorme y lejos de la carretera: una línea
 * arriba con bandera, apodo y puntos, y la foto grande debajo. En la estética futurista lleva un
 * borde de LEDs que va cambiando de color.
 */
export class PhotoGantry {
  readonly group = new Group();
  private readonly canvas = document.createElement('canvas');
  private readonly texture = new CanvasTexture(this.canvas);
  private content: LeaderPhotoContent | null = null;
  private image: HTMLImageElement | null = null;
  private leds: InstancedMesh | null = null;
  private glow: MeshBasicMaterial | null = null;
  private time = 0;
  private readonly color = new Color();
  /** El panel (foto, trasera, brillo y LEDs) con su centro en el origen. */
  private readonly board = new Group();

  constructor(
    place: DistantPhotoSpot,
    private readonly style: BillboardStyle,
    ledBorder: boolean,
  ) {
    this.canvas.width = PX;
    this.canvas.height = PH;
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;

    this.group.position.set(place.x, 0, place.z);
    this.group.rotation.y = -place.heading;
    this.group.visible = false;

    // Sin niebla: se ve nítido desde el principio de la recta
    const face = new Mesh(this.panel(W, H), new MeshBasicMaterial({ map: this.texture, fog: false }));
    // Trasera: la misma forma vista por detrás (sin girarla, para que siga la misma curva)
    const back = new Mesh(this.panel(W, H), new MeshBasicMaterial({ color: style.post, side: BackSide }));
    back.position.z = -0.05;
    this.board.add(face, back);
    this.group.add(this.board);

    if (style.glow) {
      this.glow = new MeshBasicMaterial({
        color: style.gold,
        transparent: true,
        opacity: 0.35,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      });
      const glow = new Mesh(this.panel(W + 1, H + 1), this.glow);
      glow.position.z = -0.08;
      this.board.add(glow);
    }
    if (ledBorder) this.buildLeds();

    // Escalado, curvado y sobre dos postes
    this.board.scale.setScalar(SCALE);
    this.board.position.y = BOTTOM + (H * SCALE) / 2;
    const postMat = new MeshBasicMaterial({ color: style.post });
    const top = BOTTOM + H * SCALE * 0.5;
    for (const side of [-1, 1]) {
      const post = new Mesh(new BoxGeometry(2, top, 2), postMat);
      post.position.set(side * W * SCALE * 0.3, top / 2, -0.6);
      this.group.add(post);
    }

    // El panel va siempre por encima del horizonte (su borde de abajo está más alto que la
    // cámara), así que se pinta encima de árboles, palmeras y montañas sin tapar nunca la
    // carretera ni los coches
    this.board.traverse((o) => {
      if (o instanceof Mesh || o instanceof InstancedMesh) {
        (o.material as MeshBasicMaterial).depthTest = false;
        o.renderOrder = 10;
      }
    });

    const fonts = [style.nameFont, style.valueFont].map((f) => f.replace('{px}', '40'));
    void Promise.all(fonts.map((f) => document.fonts?.load(f).catch(() => undefined))).then(() =>
      this.draw(),
    );
  }

  set(content: LeaderPhotoContent | null): void {
    // Lo mismo otra vez (la caché y luego la red): no se vuelve a cargar la foto
    if (content && this.content && sameContent(content, this.content)) return;
    this.content = content;
    this.group.visible = !!content;
    this.image = null;
    if (content?.photo) {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.draw();
      };
      img.src = content.photo;
    }
    this.draw();
  }

  /** Borde LED: cada bombilla con su tono, que avanza alrededor del cartel. */
  update(dt: number): void {
    if (!this.leds || !this.group.visible) return;
    this.time += dt;
    const n = this.leds.count;
    for (let i = 0; i < n; i++) {
      this.color.setHSL((this.time * LED_SPEED + i / n) % 1, 1, 0.55);
      this.leds.setColorAt(i, this.color);
    }
    if (this.leds.instanceColor) this.leds.instanceColor.needsUpdate = true;
    this.glow?.color.setHSL((this.time * LED_SPEED) % 1, 1, 0.5);
  }

  /** Cuánto se adelanta hacia el que llega el punto del panel a `x` del centro. */
  private bend(x: number): number {
    return RADIUS - Math.sqrt(RADIUS * RADIUS - Math.min(x * x, RADIUS * RADIUS));
  }

  /** Panel curvado: los bordes hacia el que llega. */
  private panel(w: number, h: number): PlaneGeometry {
    const geometry = new PlaneGeometry(w, h, 24, 1);
    const pos = geometry.attributes['position'];
    for (let i = 0; i < pos.count; i++) pos.setZ(i, pos.getZ(i) + this.bend(pos.getX(i)));
    pos.needsUpdate = true;
    return geometry;
  }

  private buildLeds(): void {
    const spots: [number, number][] = [];
    const { x: nx, y: ny } = LEDS_PER_SIDE;
    for (let i = 0; i < nx; i++) {
      const x = -W / 2 + (W * (i + 0.5)) / nx;
      spots.push([x, H / 2], [-x, -H / 2]);
    }
    for (let i = 0; i < ny; i++) {
      const y = -H / 2 + (H * (i + 0.5)) / ny;
      spots.push([W / 2, -y], [-W / 2, y]);
    }
    // Orden alrededor del panel para que el color «corra» por el borde
    spots.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    const leds = new InstancedMesh(
      new PlaneGeometry(0.26, 0.26),
      new MeshBasicMaterial({ color: 0xffffff, fog: false }),
      spots.length,
    );
    const o = new Object3D();
    spots.forEach(([x, y], i) => {
      o.position.set(x, y, this.bend(x) + 0.03);
      o.updateMatrix();
      leds.setMatrixAt(i, o.matrix);
      leds.setColorAt(i, this.color.setHSL(i / spots.length, 1, 0.55));
    });
    this.leds = leds;
    this.board.add(leds);
  }

  private draw(): void {
    const content = this.content;
    const c = this.canvas.getContext('2d');
    if (!c || !content) return;
    const s = this.style;
    const font = (tpl: string, px: number) => tpl.replace('{px}', String(px));
    c.clearRect(0, 0, PX, PH);
    c.fillStyle = s.background;
    c.fillRect(0, 0, PX, PH);
    c.strokeStyle = s.gold;
    c.lineWidth = 16;
    c.strokeRect(8, 8, PX - 16, PH - 16);

    // Una sola línea arriba: bandera, apodo y puntos a la derecha
    const { leader } = content;
    const flag = leader.country ? flagEmoji(leader.country) : '🏳️';
    c.textBaseline = 'middle';
    c.font = `44px ${EMOJI}`;
    c.fillText(flag, 34, 54);
    c.fillStyle = s.gold;
    c.font = font(s.valueFont, 40);
    const valueW = c.measureText(leader.value).width;
    c.fillText(leader.value, PX - 34 - valueW, 56);
    c.fillStyle = s.ink;
    c.font = font(s.nameFont, 52);
    const nameX = 104;
    const maxName = PX - 34 - valueW - 20 - nameX;
    const nameW = c.measureText(leader.nickname.toUpperCase()).width;
    c.save();
    c.translate(nameX, 56);
    if (nameW > maxName) c.scale(maxName / nameW, 1);
    c.fillText(leader.nickname.toUpperCase(), 0, 0);
    c.restore();

    // Foto grande (o la bandera en grande si no hay foto)
    const side = PX - 52;
    const x = 26;
    const y = 102;
    if (this.image) {
      c.drawImage(this.image, x, y, side, side);
    } else {
      c.fillStyle = s.post === 0x5c6672 ? '#232a33' : '#22104a';
      c.fillRect(x, y, side, side);
      c.font = `${Math.round(side * 0.5)}px ${EMOJI}`;
      c.textAlign = 'center';
      c.fillText(flag, x + side / 2, y + side / 2);
      c.textAlign = 'left';
    }
    c.strokeStyle = s.gold;
    c.lineWidth = 4;
    c.strokeRect(x, y, side, side);
    this.texture.needsUpdate = true;
  }
}

function sameContent(a: LeaderPhotoContent, b: LeaderPhotoContent): boolean {
  return (
    a.photo === b.photo &&
    a.leader.nickname === b.leader.nickname &&
    a.leader.country === b.leader.country &&
    a.leader.value === b.leader.value
  );
}
