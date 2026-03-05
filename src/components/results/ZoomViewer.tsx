"use client";

import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { motion } from "framer-motion";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import type { PlateDetection } from "@/lib/store";

interface ZoomViewerProps {
  detection: PlateDetection;
  onClose: () => void;
}

function Controls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
      <button
        onClick={() => zoomOut()}
        className="p-2 rounded-full glass-panel text-aegis-cyan hover:bg-aegis-cyan/10 transition-colors"
      >
        <ZoomOut size={18} />
      </button>
      <button
        onClick={() => resetTransform()}
        className="p-2 rounded-full glass-panel text-aegis-muted hover:bg-aegis-cyan/10 transition-colors"
      >
        <RotateCcw size={18} />
      </button>
      <button
        onClick={() => zoomIn()}
        className="p-2 rounded-full glass-panel text-aegis-cyan hover:bg-aegis-cyan/10 transition-colors"
      >
        <ZoomIn size={18} />
      </button>
    </div>
  );
}

export function ZoomViewer({ detection: d, onClose }: ZoomViewerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-aegis-bg/95 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-aegis-border/30">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold tracking-[0.15em]">
            {d.plateText}
          </span>
          <ConfidenceBadge confidence={d.confidence} size="sm" />
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-aegis-border/20 text-aegis-muted hover:text-aegis-text transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Zoom area */}
      <div className="flex-1 relative overflow-hidden">
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={8}
          doubleClick={{ mode: "zoomIn" }}
          pinch={{ step: 5 }}
        >
          <Controls />
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={d.imageDataUrl}
              alt={d.plateText}
              className="max-w-full max-h-full object-contain"
            />
          </TransformComponent>
        </TransformWrapper>

        {/* Instruction */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[10px] font-mono text-aegis-muted/60 tracking-wider bg-aegis-bg/60 px-3 py-1 rounded-full">
            PINCH OR SCROLL TO ZOOM — DOUBLE TAP TO ZOOM IN
          </span>
        </div>
      </div>

      {/* Detection details */}
      <div className="px-4 py-3 border-t border-aegis-border/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-aegis-muted tracking-wider">
            PLATE TEXT
          </span>
          <span className="font-mono text-sm font-bold">{d.plateText}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-aegis-muted tracking-wider">
            PARKING STATUS
          </span>
          <span
            className={`font-mono text-xs ${
              d.parkingStatus === "VALID"
                ? "text-aegis-green"
                : d.parkingStatus === "EXPIRED"
                ? "text-aegis-red"
                : "text-aegis-yellow"
            }`}
          >
            {d.parkingStatus}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-aegis-muted tracking-wider">
            SCANNED
          </span>
          <span className="font-mono text-xs text-aegis-muted">
            {new Date(d.timestamp).toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
