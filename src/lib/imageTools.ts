// ─────────────────────────────────────────────────────────────
// Client-side image helpers for the student photo / ID card flow.
// ─────────────────────────────────────────────────────────────

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the image."));
    img.src = src;
  });
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Could not read the file."));
    r.readAsDataURL(file);
  });
}

/**
 * Export a canvas to a Blob guaranteed under `maxBytes` (best effort).
 * JPEG (quality ladder) for opaque images; PNG (downscale ladder) when the
 * image has transparency, e.g. after background removal.
 */
export async function canvasToBlobUnder(
  canvas: HTMLCanvasElement,
  maxBytes: number,
  hasAlpha: boolean,
): Promise<Blob> {
  const toBlob = (cv: HTMLCanvasElement, type: string, q?: number) =>
    new Promise<Blob | null>((res) => cv.toBlob(res, type, q));

  if (!hasAlpha) {
    let q = 0.92;
    let blob = await toBlob(canvas, "image/jpeg", q);
    while (blob && blob.size > maxBytes && q > 0.4) {
      q -= 0.1;
      blob = await toBlob(canvas, "image/jpeg", q);
    }
    if (blob) return blob;
  }

  // Transparent → keep PNG; shrink until it fits.
  let cur = canvas;
  let blob = await toBlob(cur, "image/png");
  let scale = 0.85;
  while (blob && blob.size > maxBytes && scale >= 0.3) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(canvas.width * scale));
    c.height = Math.max(1, Math.round(canvas.height * scale));
    const ctx = c.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(canvas, 0, 0, c.width, c.height);
    cur = c;
    blob = await toBlob(cur, "image/png");
    scale -= 0.15;
  }
  if (!blob) throw new Error("Could not encode the image.");
  return blob;
}
