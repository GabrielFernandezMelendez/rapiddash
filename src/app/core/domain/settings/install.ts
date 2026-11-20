/**
 * Instalar el juego como app (acceso directo a pantalla completa):
 * - available: el navegador ofrece su aviso de instalación (Android, PC con Chrome o Edge).
 * - ios: Safari no tiene aviso; se explica Compartir → «Añadir a pantalla de inicio».
 * - installed: ya se está jugando desde la app instalada.
 * - manual: el navegador no avisa; se explica que se hace desde su menú.
 */
export type InstallState = 'available' | 'ios' | 'installed' | 'manual';

export interface InstallContext {
  /** Abierto como app instalada (`display-mode` fullscreen o standalone, o `navigator.standalone`). */
  readonly standalone: boolean;
  /** El navegador ya ha dado su aviso de instalación (`beforeinstallprompt`). */
  readonly promptReady: boolean;
  /** iPhone o iPad (en el iPad, Safari se hace pasar por Mac con pantalla táctil). */
  readonly ios: boolean;
}

export function installState(ctx: InstallContext): InstallState {
  if (ctx.standalone) return 'installed';
  if (ctx.promptReady) return 'available';
  if (ctx.ios) return 'ios';
  return 'manual';
}

/** ¿El navegador es de iPhone o iPad? */
export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}
