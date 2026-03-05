export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  return canvas;
}

/**
 * Crop a bounding box region from a canvas.
 * Adds padding around the box for better OCR context.
 */
export function cropBoundingBox(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  padding = 0.1
): HTMLCanvasElement {
  const padX = w * padding;
  const padY = h * padding;
  const sx = Math.max(0, Math.round(x - padX));
  const sy = Math.max(0, Math.round(y - padY));
  const sw = Math.min(canvas.width - sx, Math.round(w + padX * 2));
  const sh = Math.min(canvas.height - sy, Math.round(h + padY * 2));

  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  cropped.getContext("2d")!.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped;
}

/**
 * Preprocess a plate crop for Tesseract OCR.
 * Grayscale + moderate contrast only — no binary threshold.
 * Tesseract handles binarization internally via Otsu's method.
 */
export function preprocessForOCR(canvas: HTMLCanvasElement): HTMLCanvasElement {
  // Scale up small crops for better OCR
  const minWidth = 200;
  let target = canvas;
  if (canvas.width < minWidth) {
    const scale = minWidth / canvas.width;
    const scaled = document.createElement("canvas");
    scaled.width = Math.round(canvas.width * scale);
    scaled.height = Math.round(canvas.height * scale);
    scaled.getContext("2d")!.drawImage(canvas, 0, 0, scaled.width, scaled.height);
    target = scaled;
  }

  const ctx = target.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, target.width, target.height);
  const data = imageData.data;

  // Grayscale
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  // Moderate contrast enhancement (1.4x)
  const factor = 1.4;
  const mid = 128;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.min(255, Math.max(0, mid + factor * (data[i] - mid)));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }

  ctx.putImageData(imageData, 0, 0);
  return target;
}

/**
 * Full-frame preprocessing for the upload/image scan path.
 * Grayscale + contrast, no threshold.
 */
export function preprocessImage(img: HTMLImageElement): HTMLCanvasElement {
  let { naturalWidth: w, naturalHeight: h } = img;
  const maxDim = 1200;
  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return preprocessForOCR(canvas);
}
