import Tesseract from "tesseract.js";
import {
  loadImage,
  preprocessImage,
  captureVideoFrame,
  cropBoundingBox,
  preprocessForOCR,
} from "./image-utils";
import {
  detectPlates,
  loadModel,
  isModelLoaded,
  type Detection,
} from "./yolo-detector";
import { extractPlates, mockParkingStatus, type ParsedPlate } from "./plate-parser";
import type { PlateDetection } from "./store";

let worker: Tesseract.Worker | null = null;
let workerReady = false;
let workerInitPromise: Promise<Tesseract.Worker> | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (worker && workerReady) return worker;
  if (workerInitPromise) return workerInitPromise;

  workerInitPromise = (async () => {
    worker = await Tesseract.createWorker("eng", Tesseract.OEM.DEFAULT, {
      logger: () => {},
    });
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -",
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
    });
    workerReady = true;
    return worker;
  })();

  return workerInitPromise;
}

function extractWords(
  page: Tesseract.Page
): { text: string; confidence: number }[] {
  const words: { text: string; confidence: number }[] = [];
  if (!page.blocks) return words;
  for (const block of page.blocks) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const w of line.words) {
          words.push({ text: w.text, confidence: w.confidence });
        }
      }
    }
  }
  return words;
}

/** Warm up both YOLO model and Tesseract worker */
export async function warmupModels(
  onProgress?: (stage: string) => void
): Promise<void> {
  await Promise.all([
    loadModel(onProgress),
    getWorker().then(() => onProgress?.("OCR engine ready")),
  ]);
}

export interface ScanResult {
  detections: PlateDetection[];
  rawText: string;
  boxes: Detection[];
}

/**
 * OCR a single plate crop. Uses PSM.SINGLE_LINE since YOLO confirmed it's a plate.
 */
async function ocrPlateCrop(
  canvas: HTMLCanvasElement
): Promise<{ text: string; confidence: number; rawWords: { text: string; confidence: number }[] }> {
  const processed = preprocessForOCR(canvas);
  const w = await getWorker();
  const { data } = await w.recognize(processed.toDataURL());
  const rawWords = extractWords(data);
  const fullText = data.text.trim();
  const avgConf =
    rawWords.length > 0
      ? rawWords.reduce((s, w) => s + w.confidence, 0) / rawWords.length
      : 0;
  return { text: fullText, confidence: avgConf, rawWords };
}

/**
 * Full scan pipeline for an uploaded image.
 * Runs YOLO detection -> crop each plate -> OCR each crop.
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

  // YOLO detection
  if (!isModelLoaded()) await loadModel();
  onProgress?.(30);
  const boxes = await detectPlates(canvas);
  onProgress?.(50);

  const detections: PlateDetection[] = [];
  let rawText = "";

  if (boxes.length > 0) {
    // OCR each detected plate region
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const crop = cropBoundingBox(canvas, box.x, box.y, box.width, box.height);
      const ocr = await ocrPlateCrop(crop);
      rawText += ocr.text + " ";

      const plates = extractPlates(ocr.rawWords, true);
      const plateText =
        plates.length > 0 ? plates[0].text : ocr.text.replace(/[^A-Z0-9\s]/gi, "").trim();
      const plateConf = plates.length > 0 ? plates[0].confidence : ocr.confidence;

      if (plateText.length >= 3) {
        detections.push({
          id: crypto.randomUUID(),
          plateText: plateText.toUpperCase(),
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
    // Fallback: run OCR on the full preprocessed image with SPARSE_TEXT
    const processed = preprocessImage(img);
    const w = await getWorker();
    await w.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
    });
    const { data } = await w.recognize(processed.toDataURL());
    await w.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
    });
    rawText = data.text;
    const rawWords = extractWords(data);
    const plates = extractPlates(rawWords, false);

    for (const p of plates) {
      detections.push({
        id: crypto.randomUUID(),
        plateText: p.text,
        confidence: p.confidence,
        timestamp: Date.now(),
        imageDataUrl,
        parkingStatus: mockParkingStatus(),
        rawWords,
      });
    }
  }

  onProgress?.(100);
  return { detections, rawText: rawText.trim(), boxes };
}

/**
 * Real-time video frame scan.
 * YOLO detects plates -> crop -> OCR each.
 * Returns null if busy or not ready.
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

    // Snapshot for records
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

      if (plateText.length >= 3) {
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
