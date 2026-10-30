import { MenuBackdropPort } from '../../core/application/ports/out/menu-backdrop.port';
import { Aesthetic, isSynthwave } from '../../core/domain/settings/aesthetic';

/**
 * Carga la escena 3D del menú solo cuando hace falta (estéticas synthwave) y después de pintar
 * el menú, para que Three.js no entre en la carga inicial.
 */
export class LazyMenuBackdrop extends MenuBackdropPort {
  private impl: MenuBackdropPort | null = null;
  /** Evita que una carga antigua se monte si la estética cambió mientras tanto. */
  private ticket = 0;

  async attach(host: HTMLElement, aesthetic: Aesthetic): Promise<void> {
    this.dispose();
    if (!isSynthwave(aesthetic)) return;
    const ticket = ++this.ticket;
    const { ThreeMenuBackdrop } = await import('./three/menu-backdrop');
    if (ticket !== this.ticket) return;
    this.impl = new ThreeMenuBackdrop();
    await this.impl.attach(host, aesthetic);
  }

  dispose(): void {
    this.ticket++;
    this.impl?.dispose();
    this.impl = null;
  }
}
