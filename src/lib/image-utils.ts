const MAX_DIM = 1200;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function resizeToCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  maxDim = MAX_DIM
): HTMLCanvasElement {
  let width = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  let height = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);
  return canvas;
}

/**
 * Crops the center region of a canvas — this focuses OCR on where
 * the license plate is likely to be (within the targeting reticle).
 * Takes ~60% width and ~40% height from center.
 */
export function cropCenter(
  canvas: HTMLCanvasElement,
  widthRatio = 0.7,
  heightRatio = 0.45
): HTMLCanvasElement {
  const cw = Math.round(canvas.width * widthRatio);
  const ch = Math.round(canvas.height * heightRatio);
  const sx = Math.round((canvas.width - cw) / 2);
  const sy = Math.round((canvas.height - ch) / 2);
  const cropped = document.createElement("canvas");
  cropped.width = cw;
  cropped.height = ch;
  cropped.getContext("2d")!.drawImage(canvas, sx, sy, cw, ch, 0, 0, cw, ch);
  return cropped;
}

export function toGrayscale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function enhanceContrast(
  canvas: HTMLCanvasElement,
  factor = 1.8
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const mid = 128;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, mid + factor * (data[i] - mid)));
    data[i + 1] = Math.min(255, Math.max(0, mid + factor * (data[i + 1] - mid)));
    data[i + 2] = Math.min(255, Math.max(0, mid + factor * (data[i + 2] - mid)));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function adaptiveThreshold(
  canvas: HTMLCanvasElement,
  threshold = 130
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] > threshold ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function preprocessImage(img: HTMLImageElement): HTMLCanvasElement {
  const resized = resizeToCanvas(img);
  const gray = toGrayscale(resized);
  const contrasted = enhanceContrast(gray);
  return adaptiveThreshold(contrasted);
}

export function preprocessCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const resized = resizeToCanvas(canvas, 800);
  const gray = toGrayscale(resized);
  const contrasted = enhanceContrast(gray);
  return adaptiveThreshold(contrasted);
}
