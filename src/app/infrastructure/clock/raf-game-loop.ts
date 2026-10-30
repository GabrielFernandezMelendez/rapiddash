import { GameLoopPort } from '../../core/application/ports/out/game-loop.port';

/** Delta máximo por fotograma: evita saltos enormes al volver de una pestaña en segundo plano. */
const MAX_DT = 1 / 20;

export class RafGameLoop extends GameLoopPort {
  private frame = 0;
  private last = 0;

  start(tick: (dt: number) => void): void {
    this.stop();
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(MAX_DT, (now - this.last) / 1000);
      this.last = now;
      tick(dt);
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
