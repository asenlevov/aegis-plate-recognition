"use client";

import { motion } from "framer-motion";

interface ScanOverlayProps {
  progress: number;
  isProcessing: boolean;
}

export function ScanOverlay({ progress, isProcessing }: ScanOverlayProps) {
  if (!isProcessing) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-aegis-bg/80 backdrop-blur-sm rounded-lg"
    >
      {/* Rotating reticle */}
      <div className="relative w-24 h-24 mb-6">
        <svg viewBox="0 0 100 100" className="w-full h-full animate-reticle">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="rgba(0,229,255,0.15)"
            strokeWidth="1"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="rgba(0,229,255,0.8)"
            strokeWidth="2"
            strokeDasharray="60 200"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg text-aegis-cyan font-bold">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Status text */}
      <p className="font-mono text-xs text-aegis-cyan tracking-[0.3em] animate-flicker">
        {progress < 30
          ? "PREPROCESSING IMAGE"
          : progress < 60
          ? "INITIALIZING OCR ENGINE"
          : progress < 90
          ? "ANALYZING PLATE DATA"
          : "FINALIZING RESULTS"}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1 mt-4 rounded-full bg-aegis-border/30 overflow-hidden">
        <motion.div
          className="h-full bg-aegis-cyan rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}
