"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwitchCamera, X, Loader, Cpu } from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { warmupModels, scanVideoFrame } from "@/lib/ocr-engine";
import { isModelLoaded, type Detection } from "@/lib/yolo-detector";
import { useAegisStore, type PlateDetection } from "@/lib/store";

const SCAN_INTERVAL_MS = 1500;

interface LiveDetection {
  text: string;
  confidence: number;
  parkingStatus: string;
}

interface CameraCaptureProps {
  onStop: () => void;
}

export function CameraCapture({ onStop }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing...");
  const [liveDetections, setLiveDetections] = useState<LiveDetection[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [rawText, setRawText] = useState("");
  const [currentBoxes, setCurrentBoxes] = useState<Detection[]>([]);

  const addDetection = useAegisStore((s) => s.addDetection);

  // Load YOLO model + Tesseract worker
  useEffect(() => {
    mountedRef.current = true;
    warmupModels((stage) => {
      if (mountedRef.current) setLoadingStage(stage);
    }).then(() => {
      if (mountedRef.current) setModelReady(true);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: "environment" | "user") => {
      stopCamera();
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (!mountedRef.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setError(null);
      } catch {
        setError("Camera access denied. Please allow camera permissions.");
      }
    },
    [stopCamera]
  );

  // Auto-start rear camera
  useEffect(() => {
    startCamera(facingMode);
    return stopCamera;
  }, []);

  const switchCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  // Draw YOLO bounding boxes on canvas overlay
  const drawBoxes = useCallback((boxes: Detection[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const box of boxes) {
      // Bounding box
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 3;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      // Corner accents
      const cornerLen = Math.min(20, box.width * 0.15);
      ctx.strokeStyle = "#00e676";
      ctx.lineWidth = 4;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + cornerLen);
      ctx.lineTo(box.x, box.y);
      ctx.lineTo(box.x + cornerLen, box.y);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerLen, box.y);
      ctx.lineTo(box.x + box.width, box.y);
      ctx.lineTo(box.x + box.width, box.y + cornerLen);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(box.x, box.y + box.height - cornerLen);
      ctx.lineTo(box.x, box.y + box.height);
      ctx.lineTo(box.x + cornerLen, box.y + box.height);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height);
      ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen);
      ctx.stroke();

      // Confidence label
      const label = `PLATE ${(box.confidence * 100).toFixed(0)}%`;
      ctx.font = "bold 14px JetBrains Mono, monospace";
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0, 229, 255, 0.8)";
      ctx.fillRect(box.x, box.y - 22, textWidth + 10, 20);
      ctx.fillStyle = "#050510";
      ctx.fillText(label, box.x + 5, box.y - 7);
    }
  }, []);

  // Continuous scanning loop
  useEffect(() => {
    if (error || !modelReady) return;

    const scan = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !isModelLoaded()) return;

      setIsScanning(true);
      try {
        const result = await scanVideoFrame(video);
        if (!mountedRef.current) return;
        setScanCount((c) => c + 1);

        if (result) {
          setRawText(result.rawText.slice(0, 80));
          setCurrentBoxes(result.boxes);
          drawBoxes(result.boxes);

          if (result.detections.length > 0) {
            setLiveDetections(
              result.detections.map((d) => ({
                text: d.plateText,
                confidence: d.confidence,
                parkingStatus: d.parkingStatus,
              }))
            );
            result.detections.forEach((d: PlateDetection) => addDetection(d));
          } else if (result.boxes.length > 0) {
            // YOLO found plates but OCR couldn't read text yet
            setLiveDetections([]);
          } else {
            setLiveDetections([]);
          }
        } else {
          // null result means busy or not ready — clear boxes
          drawBoxes([]);
        }
      } catch {
        // retry next interval
      } finally {
        if (mountedRef.current) setIsScanning(false);
      }
    };

    const timeout = setTimeout(() => {
      scan();
      intervalRef.current = setInterval(scan, SCAN_INTERVAL_MS);
    }, 1000);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [error, modelReady, addDetection, drawBoxes]);

  const handleStop = () => {
    stopCamera();
    onStop();
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-40 bg-aegis-bg flex flex-col items-center justify-center text-aegis-muted px-6">
        <p className="text-xs font-mono text-center mb-4">{error}</p>
        <button
          onClick={() => startCamera(facingMode)}
          className="font-mono text-xs text-aegis-cyan border border-aegis-cyan/40 px-4 py-2 rounded"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* YOLO bounding box overlay canvas — matches video dimensions */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets */}
          <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-aegis-cyan/60" />
          <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-aegis-cyan/60" />
          <div className="absolute bottom-28 left-4 w-10 h-10 border-b-2 border-l-2 border-aegis-cyan/60" />
          <div className="absolute bottom-28 right-4 w-10 h-10 border-b-2 border-r-2 border-aegis-cyan/60" />

          {/* Scan line across full view */}
          <div className="absolute inset-x-0 h-full overflow-hidden">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-aegis-cyan/40 to-transparent animate-scan-line" />
          </div>

          {/* Top status bar */}
          <div className="absolute top-2 inset-x-0 flex justify-center">
            <div className="flex items-center gap-2 bg-aegis-bg/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
              {!modelReady ? (
                <>
                  <Loader size={10} className="text-aegis-yellow animate-spin" />
                  <span className="text-[9px] font-mono text-aegis-yellow tracking-[0.15em]">
                    {loadingStage.toUpperCase()}
                  </span>
                </>
              ) : isScanning ? (
                <>
                  <Loader size={10} className="text-aegis-cyan animate-spin" />
                  <span className="text-[9px] font-mono text-aegis-cyan tracking-[0.15em]">
                    ANALYZING — FRAME #{scanCount}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-aegis-green animate-pulse" />
                  <span className="text-[9px] font-mono text-aegis-cyan tracking-[0.15em]">
                    YOLO + OCR LIVE — FRAME #{scanCount}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Model info badge */}
          {modelReady && (
            <div className="absolute top-10 right-3">
              <div className="flex items-center gap-1 bg-aegis-bg/60 px-2 py-0.5 rounded">
                <Cpu size={8} className="text-aegis-green" />
                <span className="text-[7px] font-mono text-aegis-green tracking-wider">
                  YOLOv8
                </span>
              </div>
            </div>
          )}

          {/* YOLO box count indicator */}
          {currentBoxes.length > 0 && (
            <div className="absolute top-10 left-3">
              <div className="bg-aegis-green/20 border border-aegis-green/40 px-2 py-0.5 rounded">
                <span className="text-[9px] font-mono text-aegis-green tracking-wider">
                  {currentBoxes.length} PLATE{currentBoxes.length > 1 ? "S" : ""} DETECTED
                </span>
              </div>
            </div>
          )}

          {/* Live detection results overlay */}
          <AnimatePresence>
            {liveDetections.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="absolute bottom-28 inset-x-4 space-y-1.5"
              >
                {liveDetections.map((d, i) => (
                  <motion.div
                    key={`${d.text}-${i}`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center justify-between bg-aegis-bg/85 backdrop-blur-md border border-aegis-cyan/40 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-aegis-green animate-pulse" />
                      <span className="font-mono text-lg font-bold tracking-[0.15em] text-white">
                        {d.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono ${
                          d.parkingStatus === "VALID"
                            ? "text-aegis-green"
                            : d.parkingStatus === "EXPIRED"
                            ? "text-aegis-red"
                            : "text-aegis-yellow"
                        }`}
                      >
                        {d.parkingStatus}
                      </span>
                      <ConfidenceBadge confidence={d.confidence} size="sm" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Raw OCR debug */}
          {rawText && (
            <div className="absolute bottom-[7.5rem] left-4 right-4">
              <span className="text-[8px] font-mono text-aegis-muted/50 truncate block">
                OCR: {rawText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom control bar */}
      <div className="flex-shrink-0 bg-aegis-bg/90 backdrop-blur border-t border-aegis-border/30 px-6 py-3 flex items-center justify-between">
        <button
          onClick={handleStop}
          className="p-2.5 rounded-full bg-aegis-red/10 border border-aegis-red/30 text-aegis-red hover:bg-aegis-red/20 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center">
          {modelReady ? (
            <>
              <span className="text-[9px] font-mono text-aegis-muted tracking-wider">
                POINT AT LICENSE PLATE
              </span>
              <span className="text-[8px] font-mono text-aegis-cyan/60 tracking-wider mt-0.5">
                YOLO DETECTION + OCR — AUTO-SCAN
              </span>
            </>
          ) : (
            <span className="text-[9px] font-mono text-aegis-yellow tracking-wider">
              LOADING ML MODELS...
            </span>
          )}
        </div>

        <button
          onClick={switchCamera}
          className="p-2.5 rounded-full bg-aegis-surface border border-aegis-border text-aegis-muted hover:text-aegis-text transition-colors"
        >
          <SwitchCamera size={20} />
        </button>
      </div>
    </div>
  );
}
