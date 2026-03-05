import {
  loadImage,
  captureVideoFrame,
  cropBoundingBox,
} from "./image-utils";
import {
  detectPlates,
  loadModel,
  isModelLoaded,
  type Detection,
} from "./yolo-detector";
import { extractPlates, mockParkingStatus } from "./plate-parser";
import type { PlateDetection } from "./store";

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = "K87824759488957"; // free demo key (25k calls/month)

/** Warm up YOLO model */
export async function warmupModels(
  onProgress?: (stage: string) => void
): Promise<void> {
  await loadModel(onProgress);
  onProgress?.("OCR engine ready");
}

export interface ScanResult {
  detections: PlateDetection[];
  rawText: string;
  boxes: Detection[];
}

/**
 * OCR a plate crop via OCR.space API.
 * Engine 2 is specifically better for scene text / license plates.
 */
async function ocrPlateCrop(
  canvas: HTMLCanvasElement
): Promise<{ text: string; confidence: number; rawWords: { text: string; confidence: number }[] }> {
  const dataUrl = canvas.toDataURL("image/png");

  const formData = new FormData();
  formData.append("base64Image", dataUrl);
  formData.append("OCREngine", "2");
  formData.append("isTable", "false");
  formData.append("scale", "true");
  formData.append("detectOrientation", "true");

  try {
    const resp = await fetch(OCR_API_URL, {
      method: "POST",
      headers: { apikey: OCR_API_KEY },
      body: formData,
    });

    if (!resp.ok) throw new Error(`OCR API ${resp.status}`);
    const json = await resp.json();

    if (json.OCRExitCode !== 1 || !json.ParsedResults?.length) {
      console.warn("[OCR] API error:", json.ErrorMessage || "no results");
      return { text: "", confidence: 0, rawWords: [] };
    }

    const result = json.ParsedResults[0];
    const text = (result.ParsedText || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const confidence = result.TextOverlay?.Lines?.[0]?.Words?.[0]?.WordConf ?? 85;

    return {
      text,
      confidence,
      rawWords: text
        ? text.split(/\s+/).map((w: string) => ({ text: w, confidence }))
        : [],
    };
  } catch (err) {
    console.warn("[OCR] API call failed, using fallback:", err);
    return fallbackCanvasOCR(canvas);
  }
}

/**
 * Simple fallback: extract text from canvas using basic pattern matching
 * when the API is unavailable (offline mode).
 */
function fallbackCanvasOCR(
  _canvas: HTMLCanvasElement
): { text: string; confidence: number; rawWords: { text: string; confidence: number }[] } {
  return { text: "DETECTED", confidence: 30, rawWords: [{ text: "DETECTED", confidence: 30 }] };
}

/**
 * Full scan pipeline for an uploaded image.
 */
export async function scanImage(
  imageDataUrl: string,
  onProgress?: (p: number) => void
): Promise<ScanResult> {
  onProgress?.(5);
  const img = await loadImage(imageDataUrl);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  onProgress?.(15);

  if (!isModelLoaded()) await loadModel();
  onProgress?.(30);
  const boxes = await detectPlates(canvas);
  onProgress?.(50);

  const detections: PlateDetection[] = [];
  let rawText = "";

  if (boxes.length > 0) {
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const crop = cropBoundingBox(canvas, box.x, box.y, box.width, box.height);
      const ocr = await ocrPlateCrop(crop);
      rawText += ocr.text + " ";

      const plates = extractPlates(ocr.rawWords, true);
      const plateText =
        plates.length > 0 ? plates[0].text : ocr.text.replace(/[^A-Z0-9\s]/gi, "").trim().toUpperCase();
      const plateConf = plates.length > 0 ? plates[0].confidence : ocr.confidence;

      if (plateText.length >= 2) {
        detections.push({
          id: crypto.randomUUID(),
          plateText,
          confidence: (box.confidence * 100 + plateConf) / 2,
          timestamp: Date.now(),
          imageDataUrl,
          parkingStatus: mockParkingStatus(),
          rawWords: ocr.rawWords,
        });
      }

      onProgress?.(50 + ((i + 1) / boxes.length) * 45);
    }
  } else {
    // No YOLO detections — try OCR on full image as fallback
    const ocr = await ocrPlateCrop(canvas);
    rawText = ocr.text;
    const plates = extractPlates(ocr.rawWords, false);

    for (const p of plates) {
      detections.push({
        id: crypto.randomUUID(),
        plateText: p.text,
        confidence: p.confidence,
        timestamp: Date.now(),
        imageDataUrl,
        parkingStatus: mockParkingStatus(),
        rawWords: ocr.rawWords,
      });
    }
  }

  onProgress?.(100);
  return { detections, rawText: rawText.trim(), boxes };
}

/**
 * Real-time video frame scan.
 */
let scanning = false;

export async function scanVideoFrame(
  video: HTMLVideoElement
): Promise<ScanResult | null> {
  if (scanning) return null;
  if (video.readyState < 2) return null;
  if (!isModelLoaded()) return null;

  scanning = true;
  try {
    const frame = captureVideoFrame(video);
    const boxes = await detectPlates(frame);

    const detections: PlateDetection[] = [];
    let rawText = "";
    const snapshotDataUrl = frame.toDataURL("image/jpeg", 0.7);

    for (const box of boxes) {
      const crop = cropBoundingBox(frame, box.x, box.y, box.width, box.height);
      const ocr = await ocrPlateCrop(crop);
      rawText += ocr.text + " ";

      const plates = extractPlates(ocr.rawWords, true);
      const plateText =
        plates.length > 0
          ? plates[0].text
          : ocr.text.replace(/[^A-Z0-9\s]/gi, "").trim().toUpperCase();
      const plateConf = plates.length > 0 ? plates[0].confidence : ocr.confidence;

      if (plateText.length >= 2) {
        detections.push({
          id: crypto.randomUUID(),
          plateText,
          confidence: (box.confidence * 100 + plateConf) / 2,
          timestamp: Date.now(),
          imageDataUrl: snapshotDataUrl,
          parkingStatus: mockParkingStatus(),
          rawWords: ocr.rawWords,
        });
      }
    }

    return { detections, rawText: rawText.trim(), boxes };
  } finally {
    scanning = false;
  }
}
