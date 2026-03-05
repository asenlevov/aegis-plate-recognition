"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Crosshair } from "lucide-react";
import { CameraCapture } from "@/components/scanner/CameraCapture";
import { ImageUpload } from "@/components/scanner/ImageUpload";
import { ScanOverlay } from "@/components/scanner/ScanOverlay";
import { ScanResults } from "@/components/scanner/ScanResults";
import { HUDCard } from "@/components/ui/HUDCard";
import { scanImage, type ScanResult } from "@/lib/ocr-engine";
import { useAegisStore } from "@/lib/store";

type Mode = "select" | "camera" | "upload" | "processing" | "results";

export default function ScanPage() {
  const [mode, setMode] = useState<Mode>("select");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const addDetection = useAegisStore((s) => s.addDetection);

  const processImage = useCallback(
    async (dataUrl: string) => {
      setCapturedImage(dataUrl);
      setMode("processing");
      setProgress(0);

      try {
        const scanResult = await scanImage(dataUrl, (p) => setProgress(p));
        setResult(scanResult);
        scanResult.detections.forEach((d) => addDetection(d));
        setMode("results");
      } catch (err) {
        console.error("Scan failed:", err);
        setMode("select");
      }
    },
    [addDetection]
  );

  const reset = () => {
    setMode("select");
    setCapturedImage(null);
    setProgress(0);
    setResult(null);
  };

  // Camera mode renders a full-screen overlay — no scroll needed
  if (mode === "camera") {
    return <CameraCapture onStop={() => setMode("select")} />;
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Crosshair size={20} className="text-aegis-cyan" />
        <h1 className="font-mono text-sm tracking-[0.2em] text-aegis-cyan">
          PLATE SCANNER
        </h1>
      </motion.div>

      {/* Mode selector */}
      <AnimatePresence mode="wait">
        {mode === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <button
              onClick={() => setMode("camera")}
              className="glass-panel rounded-lg p-6 flex flex-col items-center gap-3 hover:border-aegis-cyan/30 transition-colors group"
            >
              <div className="p-3 rounded-full bg-aegis-cyan/10 text-aegis-cyan group-hover:bg-aegis-cyan/20 transition-colors">
                <Camera size={24} />
              </div>
              <span className="font-mono text-xs tracking-wider text-aegis-muted group-hover:text-aegis-text">
                LIVE SCAN
              </span>
              <span className="text-[9px] font-mono text-aegis-muted/50">
                REAL-TIME DETECTION
              </span>
            </button>
            <button
              onClick={() => setMode("upload")}
              className="glass-panel rounded-lg p-6 flex flex-col items-center gap-3 hover:border-aegis-cyan/30 transition-colors group"
            >
              <div className="p-3 rounded-full bg-aegis-blue/10 text-aegis-blue group-hover:bg-aegis-blue/20 transition-colors">
                <Upload size={24} />
              </div>
              <span className="font-mono text-xs tracking-wider text-aegis-muted group-hover:text-aegis-text">
                UPLOAD
              </span>
              <span className="text-[9px] font-mono text-aegis-muted/50">
                ANALYZE IMAGE
              </span>
            </button>
          </motion.div>
        )}

        {mode === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <HUDCard title="Image Upload">
              <ImageUpload onUpload={processImage} />
            </HUDCard>
          </motion.div>
        )}

        {(mode === "processing" || mode === "results") && capturedImage && (
          <motion.div
            key="result-area"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <HUDCard title="Source Image">
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className="w-full rounded-md"
                />
                <ScanOverlay
                  progress={progress}
                  isProcessing={mode === "processing"}
                />
              </div>
            </HUDCard>

            {mode === "results" && result && (
              <ScanResults
                detections={result.detections}
                rawText={result.rawText}
                onNewScan={reset}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sample images for quick demo */}
      {(mode === "select" || mode === "upload") && (
        <HUDCard title="Demo Samples">
          <p className="text-[10px] font-mono text-aegis-muted mb-3 tracking-wider">
            TAP A SAMPLE TO SCAN INSTANTLY
          </p>

          {/* Real photo test */}
          <button
            onClick={() => processImage("/sample-plates/car_test.jpg")}
            className="w-full mb-3 relative aspect-video rounded border border-aegis-green/30 overflow-hidden hover:border-aegis-green/60 transition-colors group bg-aegis-surface flex items-center justify-center"
          >
            <img
              src="/sample-plates/car_test.jpg"
              alt="Bulgarian plate test"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <span className="text-[10px] font-mono text-aegis-green tracking-wider">
                BG PLATE TEST — CB 1000 KA
              </span>
            </div>
          </button>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => processImage(`/sample-plates/plate${n}.svg`)}
                className="relative aspect-video rounded border border-aegis-border/30 overflow-hidden hover:border-aegis-cyan/40 transition-colors group bg-aegis-surface flex items-center justify-center"
              >
                <img
                  src={`/sample-plates/plate${n}.svg`}
                  alt={`Sample ${n}`}
                  className="w-full h-full object-contain p-1"
                />
                <div className="absolute inset-0 bg-aegis-cyan/0 group-hover:bg-aegis-cyan/5 transition-colors" />
              </button>
            ))}
          </div>
        </HUDCard>
      )}
    </div>
  );
}
