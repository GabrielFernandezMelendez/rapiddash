import { GhostFrame } from './ghost';

/**
 * Fantasma comprimido para guardarlo en la nube. Cada fotograma son 6 enteros:
 * tiempo (ms) y progreso (cm) como diferencia con el anterior, tramo, distancia (cm),
 * lateral (cm) y giro (milirradianes). Separados por «,» y los fotogramas por «;».
 * Una vuelta de un minuto a 20 Hz ocupa unos 30 KB (el límite de un documento es 1 MB).
 */
export const GHOST_CODEC_VERSION = 1;

const round = Math.round;

export function encodeGhost(frames: readonly GhostFrame[]): string {
  let prevTime = 0;
  let prevProgress = 0;
  const parts = frames.map((f) => {
    const time = round(f.time * 1000);
    const progress = round(f.progress * 100);
    const line = [
      time - prevTime,
      progress - prevProgress,
      f.leg,
      round(f.distance * 100),
      round(f.lateral * 100),
      round(f.yaw * 1000),
    ].join(',');
    prevTime = time;
    prevProgress = progress;
    return line;
  });
  return `${GHOST_CODEC_VERSION}|${parts.join(';')}`;
}

/** null si el texto no es un fantasma válido (versión desconocida o datos rotos). */
export function decodeGhost(encoded: string): GhostFrame[] | null {
  const [version, body] = encoded.split('|');
  if (Number(version) !== GHOST_CODEC_VERSION || !body) return null;
  let time = 0;
  let progress = 0;
  const frames: GhostFrame[] = [];
  for (const line of body.split(';')) {
    const n = line.split(',').map(Number);
    if (n.length !== 6 || n.some((v) => !Number.isFinite(v))) return null;
    time += n[0];
    progress += n[1];
    frames.push({
      time: time / 1000,
      progress: progress / 100,
      leg: n[2],
      distance: n[3] / 100,
      lateral: n[4] / 100,
      yaw: n[5] / 1000,
    });
  }
  return frames;
}
