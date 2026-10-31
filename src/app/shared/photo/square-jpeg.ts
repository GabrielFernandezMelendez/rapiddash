import { PHOTO_MAX_LENGTH, PHOTO_QUALITY, PHOTO_SIZE } from '../../core/domain/tournament/leader-photo';

/**
 * Recorta el centro de una imagen o de un vídeo en un cuadrado de PHOTO_SIZE px y lo devuelve
 * como JPEG en data URL. Si sale demasiado grande, baja la calidad hasta que quepa.
 * `mirror`: la cámara frontal se ve como un espejo; la foto se guarda igual que se veía.
 */
export function squareJpeg(source: CanvasImageSource, width: number, height: number, mirror = false): string {
  const side = Math.min(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sin canvas');
  if (mirror) {
    ctx.translate(PHOTO_SIZE, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (width - side) / 2, (height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  let quality = PHOTO_QUALITY;
  let url = canvas.toDataURL('image/jpeg', quality);
  while (url.length > PHOTO_MAX_LENGTH && quality > 0.3) {
    quality -= 0.15;
    url = canvas.toDataURL('image/jpeg', quality);
  }
  return url;
}

/** Foto elegida de la galería → cuadrado JPEG. */
export async function fileToSquareJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return squareJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
