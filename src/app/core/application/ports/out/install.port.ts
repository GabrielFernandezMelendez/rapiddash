import { InstallState } from '../../../domain/settings/install';

/** Instalar el juego como app desde el navegador. */
export abstract class InstallPort {
  /** Estado de ahora (cambia cuando el navegador da su aviso o al instalarse). */
  abstract state(): InstallState;
  /** Avisa cada vez que cambia el estado. Devuelve cómo dejar de escuchar. */
  abstract onChange(listener: (state: InstallState) => void): () => void;
  /** Abre el aviso de instalación del navegador; true si el jugador acepta. */
  abstract install(): Promise<boolean>;
}
