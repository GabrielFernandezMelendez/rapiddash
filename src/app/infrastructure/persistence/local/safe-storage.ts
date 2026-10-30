// localStorage puede no existir o lanzar (modo privado, cuota llena): nunca debe romper el juego.
export function readJson<T>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: se pierde el dato, el juego sigue
  }
}

export function removeKey(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Sin almacenamiento: nada que borrar
  }
}
