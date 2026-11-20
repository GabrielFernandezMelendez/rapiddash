import { Injectable } from '@angular/core';
import { InstallPort } from '../../core/application/ports/out/install.port';
import { InstallState, installState, isIosDevice } from '../../core/domain/settings/install';

/** El aviso de instalación de Chrome y Edge (no está en los tipos del DOM). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Instalar desde el navegador: guarda el aviso `beforeinstallprompt` (llega solo una vez y
 * pronto, por eso se crea al arrancar la app) y lo abre cuando el jugador pulsa el botón.
 */
@Injectable()
export class BrowserInstallAdapter extends InstallPort {
  private prompt: InstallPromptEvent | null = null;
  private installed = false;
  private readonly listeners = new Set<(state: InstallState) => void>();

  constructor() {
    super();
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e) => {
      // Sin el mini aviso del navegador: se instala desde Ajustes
      e.preventDefault();
      this.prompt = e as InstallPromptEvent;
      this.emit();
    });
    window.addEventListener('appinstalled', () => {
      this.prompt = null;
      this.installed = true;
      this.emit();
    });
  }

  state(): InstallState {
    const nav = globalThis.navigator as Navigator & { standalone?: boolean };
    const standalone =
      this.installed ||
      nav?.standalone === true ||
      ['fullscreen', 'standalone'].some((m) => globalThis.matchMedia?.(`(display-mode: ${m})`).matches);
    return installState({
      standalone,
      promptReady: this.prompt !== null,
      ios: isIosDevice(nav?.userAgent ?? '', nav?.maxTouchPoints ?? 0),
    });
  }

  onChange(listener: (state: InstallState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async install(): Promise<boolean> {
    const prompt = this.prompt;
    if (!prompt) return false;
    // El aviso solo se puede usar una vez
    this.prompt = null;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    this.emit();
    return outcome === 'accepted';
  }

  private emit(): void {
    const state = this.state();
    for (const listener of this.listeners) listener(state);
  }
}
