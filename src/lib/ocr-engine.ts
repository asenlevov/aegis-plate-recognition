import Tesseract from "tesseract.js";
import { loadImage, preprocessImage } from "./image-utils";
import { extractPlates, mockParkingStatus, type ParsedPlate } from "./plate-parser";
import type { PlateDetection } from "./store";

let worker: Tesseract.Worker | null = null;

async function getWorker(): Promise<Tesseract.Worker> {
  if (worker) return worker;
  worker = await Tesseract.createWorker("eng", Tesseract.OEM.DEFAULT, {
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -",
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });
  return worker;
}

function extractWords(page: Tesseract.Page): { text: string; confidence: number }[] {
  const words: { text: string; confidence: number }[] = [];
  if (!page.blocks) return words;
  for (const block of page.blocks) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const word of line.words) {
          words.push({ text: word.text, confidence: word.confidence });
        }
      }
    }
  }
  return words;
}

export interface ScanResult {
  detections: PlateDetection[];
  rawText: string;
}

export async function scanImage(
  imageDataUrl: string,
  onProgress?: (p: number) => void
): Promise<ScanResult> {
  onProgress?.(5);

  const img = await loadImage(imageDataUrl);
  onProgress?.(15);

  const processed = preprocessImage(img);
  onProgress?.(30);

  const w = await getWorker();
  onProgress?.(40);

  const { data } = await w.recognize(processed.toDataURL());
  onProgress?.(85);

  const rawWords = extractWords(data);

  const plates = extractPlates(rawWords);
  onProgress?.(95);

  const detections: PlateDetection[] = plates.map((p: ParsedPlate) => ({
    id: crypto.randomUUID(),
    plateText: p.text,
    confidence: p.confidence,
    timestamp: Date.now(),
    imageDataUrl,
    parkingStatus: mockParkingStatus(),
    rawWords,
  }));

  onProgress?.(100);
  return { detections, rawText: data.text };
}
