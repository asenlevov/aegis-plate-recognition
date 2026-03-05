/**
 * YOLOv8 license plate detector running client-side via onnxruntime-web.
 * Loads a pre-trained ONNX model and returns bounding boxes for detected plates.
 */

import type { InferenceSession, Tensor } from "onnxruntime-web";

const MODEL_PATH = "/model/plate-detect.onnx";
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.35;
const IOU_THRESHOLD = 0.45;

export interface Detection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

let session: InferenceSession | null = null;
let sessionPromise: Promise<InferenceSession> | null = null;
let ortModule: typeof import("onnxruntime-web") | null = null;

async function getOrt() {
  if (ortModule) return ortModule;
  ortModule = await import("onnxruntime-web");
  ortModule.env.wasm.wasmPaths =
    "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/";
  ortModule.env.wasm.numThreads = 1;
  return ortModule;
}

export async function loadModel(
  onProgress?: (stage: string) => void
): Promise<InferenceSession> {
  if (session) return session;
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    onProgress?.("Loading ONNX Runtime...");
    const ort = await getOrt();
    onProgress?.("Downloading plate detection model...");
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
    onProgress?.("Model ready");
    return session;
  })();

  return sessionPromise;
}

export function isModelLoaded(): boolean {
  return session !== null;
}

/**
 * Preprocess a canvas frame into a YOLO input tensor.
 * Resizes to 640x640, normalizes [0,1], converts to NCHW float32.
 * Returns the tensor and the scale factors needed to map boxes back.
 */
function preprocess(
  canvas: HTMLCanvasElement
): { tensor: Tensor; scaleX: number; scaleY: number } {
  const ort = ortModule!;
  const resized = document.createElement("canvas");
  resized.width = INPUT_SIZE;
  resized.height = INPUT_SIZE;
  const ctx = resized.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = imageData;
  const numPixels = INPUT_SIZE * INPUT_SIZE;
  const float32 = new Float32Array(3 * numPixels);

  // NCHW layout: [R...][G...][B...], normalized to [0, 1]
  for (let i = 0; i < numPixels; i++) {
    const offset = i * 4;
    float32[i] = data[offset] / 255;
    float32[numPixels + i] = data[offset + 1] / 255;
    float32[2 * numPixels + i] = data[offset + 2] / 255;
  }

  return {
    tensor: new ort.Tensor("float32", float32, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    scaleX: canvas.width / INPUT_SIZE,
    scaleY: canvas.height / INPUT_SIZE,
  };
}

/** IoU (Intersection over Union) for NMS */
function iou(a: Detection, b: Detection): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  return inter / (areaA + areaB - inter);
}

/** Non-Maximum Suppression */
function nms(boxes: Detection[]): Detection[] {
  const sorted = [...boxes].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(sorted[i]);
    for (let j = i + 1; j < sorted.length; j++) {
      if (!suppressed.has(j) && iou(sorted[i], sorted[j]) > IOU_THRESHOLD) {
        suppressed.add(j);
      }
    }
  }
  return kept;
}

/**
 * Run YOLOv8 plate detection on a canvas frame.
 * Returns detected plate bounding boxes in original image coordinates.
 */
export async function detectPlates(
  canvas: HTMLCanvasElement
): Promise<Detection[]> {
  if (!session) return [];

  const { tensor, scaleX, scaleY } = preprocess(canvas);

  const inputName = session.inputNames[0];
  const results = await session.run({ [inputName]: tensor });
  const output = results[session.outputNames[0]];
  const raw = output.data as Float32Array;
  const dims = output.dims; // [1, 5, num_boxes] for YOLOv8 single-class

  // YOLOv8 output: [1, 4+num_classes, num_boxes]
  // rows: [cx, cy, w, h, conf_class0, ...]
  const numBoxes = dims[2];
  const numFields = dims[1]; // 5 for single-class
  const detections: Detection[] = [];

  for (let i = 0; i < numBoxes; i++) {
    // Find the max class confidence (skip first 4 fields which are box coords)
    let maxConf = 0;
    for (let c = 4; c < numFields; c++) {
      const conf = raw[c * numBoxes + i];
      if (conf > maxConf) maxConf = conf;
    }

    if (maxConf < CONF_THRESHOLD) continue;

    const cx = raw[0 * numBoxes + i] * scaleX;
    const cy = raw[1 * numBoxes + i] * scaleY;
    const w = raw[2 * numBoxes + i] * scaleX;
    const h = raw[3 * numBoxes + i] * scaleY;

    detections.push({
      x: cx - w / 2,
      y: cy - h / 2,
      width: w,
      height: h,
      confidence: maxConf,
    });
  }

  return nms(detections);
}
