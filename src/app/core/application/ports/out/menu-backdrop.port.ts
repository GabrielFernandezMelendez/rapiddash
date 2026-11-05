/** Fondo animado de los menús: escena 3D synthwave con el deportivo rodando hacia el sol. */
export abstract class MenuBackdropPort {
  abstract attach(host: HTMLElement): Promise<void>;
  abstract dispose(): void;
}
