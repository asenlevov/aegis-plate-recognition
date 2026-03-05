"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SwitchCamera, X, Loader } from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { scanVideoFrame, warmupWorker } from "@/lib/ocr-engine";
import { useAegisStore, type PlateDetection } from "@/lib/store";

const SCAN_INTERVAL_MS = 2000;

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
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [liveDetections, setLiveDetections] = useState<LiveDetection[]>([]);
  const [scanCount, setScanCount] = useState(0);
  const [rawText, setRawText] = useState("");

  const addDetection = useAegisStore((s) => s.addDetection);

  // Warm up OCR worker as soon as component mounts
  useEffect(() => {
    warmupWorker();
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
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

  const startCamera = useCallback(async (facing: "environment" | "user") => {
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
  }, [stopCamera]);

  // Auto-start rear camera on mount
  useEffect(() => {
    startCamera(facingMode);
    return stopCamera;
  }, []);

  // Restart when facing changes
  const switchCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  // Continuous scanning loop
  useEffect(() => {
    if (error) return;

    const scan = async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      setIsScanning(true);
      try {
        const result = await scanVideoFrame(video);
        if (!mountedRef.current) return;
        setScanCount((c) => c + 1);
        setRawText(result?.rawText?.slice(0, 60) ?? "");

        if (result && result.detections.length > 0) {
          setLiveDetections(
            result.detections.map((d) => ({
              text: d.plateText,
              confidence: d.confidence,
              parkingStatus: d.parkingStatus,
            }))
          );
          result.detections.forEach((d: PlateDetection) => addDetection(d));
        } else {
          setLiveDetections([]);
        }
      } catch {
        // ignore scan errors, retry next interval
      } finally {
        if (mountedRef.current) setIsScanning(false);
      }
    };

    // First scan after 1.5s, then every SCAN_INTERVAL_MS
    const timeout = setTimeout(() => {
      scan();
      intervalRef.current = setInterval(scan, SCAN_INTERVAL_MS);
    }, 1500);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [error, addDetection]);

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
      {/* Video — fills screen, no scroll */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets */}
          <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-aegis-cyan/60" />
          <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-aegis-cyan/60" />
          <div className="absolute bottom-28 left-4 w-10 h-10 border-b-2 border-l-2 border-aegis-cyan/60" />
          <div className="absolute bottom-28 right-4 w-10 h-10 border-b-2 border-r-2 border-aegis-cyan/60" />

          {/* Center targeting reticle — indicates crop zone */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[40%] border-2 border-aegis-cyan/40 rounded">
            <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-aegis-cyan" />
            <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-aegis-cyan" />
            <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-aegis-cyan" />
            <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-aegis-cyan" />

            {/* Scan line */}
            <div className="absolute inset-0 overflow-hidden rounded">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-aegis-cyan/60 to-transparent animate-scan-line" />
            </div>
          </div>

          {/* Top status bar */}
          <div className="absolute top-2 inset-x-0 flex justify-center">
            <div className="flex items-center gap-2 bg-aegis-bg/60 backdrop-blur-sm px-3 py-1 rounded-full">
              {isScanning ? (
                <Loader size={10} className="text-aegis-cyan animate-spin" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-aegis-green animate-pulse" />
              )}
              <span className="text-[9px] font-mono text-aegis-cyan tracking-[0.2em]">
                {isScanning ? "SCANNING" : "LIVE"} — FRAME #{scanCount}
              </span>
            </div>
          </div>

          {/* Live detection overlay */}
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
                    className="flex items-center justify-between bg-aegis-bg/80 backdrop-blur-md border border-aegis-cyan/30 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-aegis-cyan animate-pulse" />
                      <span className="font-mono text-base font-bold tracking-[0.15em] text-white">
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

          {/* Raw OCR text debug (small) */}
          {rawText && (
            <div className="absolute bottom-[7.5rem] left-4 right-4">
              <span className="text-[8px] font-mono text-aegis-muted/40 truncate block">
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
          <span className="text-[9px] font-mono text-aegis-muted tracking-wider">
            POINT AT LICENSE PLATE
          </span>
          <span className="text-[8px] font-mono text-aegis-cyan/60 tracking-wider mt-0.5">
            AUTO-SCANNING EVERY 2s
          </span>
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
