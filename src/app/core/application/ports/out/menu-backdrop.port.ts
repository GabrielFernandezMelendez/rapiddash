import { Aesthetic } from '../../../domain/settings/aesthetic';

/**
 * Fondo animado de los menús. En las estéticas synthwave es una escena 3D (el vehículo rodando
 * hacia el sol); en la clásica no hace nada y se ve la carretera dibujada con CSS.
 */
export abstract class MenuBackdropPort {
  abstract attach(host: HTMLElement, aesthetic: Aesthetic): Promise<void>;
  abstract dispose(): void;
}
