import { CanvasTexture, LinearFilter, Sprite, SpriteMaterial } from 'three';

const HEIGHT_PX = 64;
/** Alto de la etiqueta en el mundo (m) y altura sobre el coche. */
const WORLD_HEIGHT = 0.9;
const LIFT = 2.1;

/**
 * Etiqueta con bandera y apodo encima del fantasma de un rival: una pastilla oscura con borde
 * del color del fantasma, dibujada en un canvas y siempre de cara a la cámara.
 */
export class GhostLabel {
  readonly sprite: Sprite;
  private text = '';
  private readonly canvas = document.createElement('canvas');
  private readonly texture = new CanvasTexture(this.canvas);

  constructor(private readonly ink: string) {
    this.texture.minFilter = LinearFilter;
    this.sprite = new Sprite(
      new SpriteMaterial({ map: this.texture, transparent: true, depthTest: false, fog: false }),
    );
    this.sprite.renderOrder = 10;
    this.sprite.visible = false;
  }

  update(label: { text: string; opacity: number } | null, x: number, z: number): void {
    const show = !!label && label.opacity > 0;
    this.sprite.visible = show;
    if (!label || !show) return;
    if (label.text !== this.text) this.draw(label.text);
    (this.sprite.material as SpriteMaterial).opacity = label.opacity;
    this.sprite.position.set(x, LIFT, z);
  }

  dispose(): void {
    this.texture.dispose();
    (this.sprite.material as SpriteMaterial).dispose();
  }

  private draw(text: string): void {
    this.text = text;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const font = `700 ${HEIGHT_PX * 0.5}px system-ui, sans-serif`;
    ctx.font = font;
    const pad = HEIGHT_PX * 0.35;
    const width = Math.ceil(ctx.measureText(text).width + pad * 2);
    this.canvas.width = width;
    this.canvas.height = HEIGHT_PX;
    ctx.font = font;
    const r = HEIGHT_PX / 2 - 3;
    ctx.fillStyle = 'rgba(13,16,20,0.78)';
    ctx.strokeStyle = this.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(2, 2, width - 4, HEIGHT_PX - 4, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad, HEIGHT_PX / 2 + 2);
    this.texture.needsUpdate = true;
    this.sprite.scale.set((WORLD_HEIGHT * width) / HEIGHT_PX, WORLD_HEIGHT, 1);
  }
}
