import { MenuBackdropPort } from '../../core/application/ports/out/menu-backdrop.port';

/**
 * Carga la escena 3D del menú después de pintar
 * el menú, para que Three.js no entre en la carga inicial.
 */
export class LazyMenuBackdrop extends MenuBackdropPort {
  private impl: MenuBackdropPort | null = null;
  /** Evita que una carga antigua se monte si se cambió de pantalla mientras tanto. */
  private ticket = 0;

  async attach(host: HTMLElement): Promise<void> {
    this.dispose();
    const ticket = ++this.ticket;
    const { ThreeMenuBackdrop } = await import('./three/menu-backdrop');
    if (ticket !== this.ticket) return;
    this.impl = new ThreeMenuBackdrop();
    await this.impl.attach(host);
  }

  dispose(): void {
    this.ticket++;
    this.impl?.dispose();
    this.impl = null;
  }
}
