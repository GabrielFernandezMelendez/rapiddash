import { DriveInput } from '../../../domain/car/car';

/** Puerto de entrada de controles: táctil, teclado o ambos. */
export abstract class InputPort {
  abstract attach(surface: HTMLElement): void;
  /** Devuelve el estado actual y vacía la cola de swipes. */
  abstract read(): DriveInput;
  abstract dispose(): void;
}
