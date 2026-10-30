/** Reloj del juego: llama a `tick` una vez por fotograma con el delta en segundos. */
export abstract class GameLoopPort {
  abstract start(tick: (dt: number) => void): void;
  abstract stop(): void;
}
