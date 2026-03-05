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
  img: HTMLImageElement,
  maxDim = MAX_DIM
): HTMLCanvasElement {
  let { width, height } = img;
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
  factor = 1.6
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const mid = 128;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, mid + factor * (data[i] - mid)));
    data[i + 1] = Math.min(
      255,
      Math.max(0, mid + factor * (data[i + 1] - mid))
    );
    data[i + 2] = Math.min(
      255,
      Math.max(0, mid + factor * (data[i + 2] - mid))
    );
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function adaptiveThreshold(
  canvas: HTMLCanvasElement,
  threshold = 140
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
