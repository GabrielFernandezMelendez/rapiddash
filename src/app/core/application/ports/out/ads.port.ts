/** Anuncios. De momento no hay: el adaptador vacío da la recompensa sin enseñar nada. */
export abstract class AdsPort {
  /** Anuncio bonificado: true si se ha visto entero y toca dar la recompensa. */
  abstract showRewarded(): Promise<boolean>;
}
