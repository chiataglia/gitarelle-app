// Ritaglia al centro un quadrato e lo ridimensiona (es. avatar 256x256 JPEG, pochi KB):
// così al backend arriva sempre un'immagine piccola, qualunque foto si scelga.
export async function resizeToSquare(file: File, size = 256, quality = 0.88): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Formato immagine non supportato dal browser (usa JPEG, PNG o WebP)");
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossibile elaborare l'immagine");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Impossibile elaborare l'immagine"))), "image/jpeg", quality)
  );
}
