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
 * Enforces plate-like aspect ratio: if the box is too tall (YOLO often
 * overestimates height), constrain to center strip with ~4:1 ratio.
 */
export function cropBoundingBox(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  w: number,
  h: number,
  padding = 0.15
): HTMLCanvasElement {
  // If the box is too square/tall for a plate, narrow the height
  const minAspect = 2.5;
  let cropH = h;
  let cropY = y;
  if (w / h < minAspect) {
    cropH = w / minAspect;
    cropY = y + (h - cropH) / 2;
  }

  const padX = w * padding;
  const padY = cropH * 0.2;
  const sx = Math.max(0, Math.round(x - padX));
  const sy = Math.max(0, Math.round(cropY - padY));
  const sw = Math.min(canvas.width - sx, Math.round(w + padX * 2));
  const sh = Math.min(canvas.height - sy, Math.round(cropH + padY * 2));

  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  cropped.getContext("2d")!.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped;
}

