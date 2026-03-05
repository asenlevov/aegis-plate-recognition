"use client";

import { motion } from "framer-motion";
import { Check, AlertTriangle, HelpCircle, RotateCcw } from "lucide-react";
import { ConfidenceBadge, ConfidenceBar } from "@/components/ui/ConfidenceBadge";
import { GlowButton } from "@/components/ui/GlowButton";
import type { PlateDetection } from "@/lib/store";

interface ScanResultsProps {
  detections: PlateDetection[];
  rawText: string;
  onNewScan: () => void;
}

const statusConfig = {
  VALID: {
    icon: Check,
    color: "text-aegis-green",
    bg: "bg-aegis-green/10 border-aegis-green/30",
    label: "PARKING VALID",
  },
  EXPIRED: {
    icon: AlertTriangle,
    color: "text-aegis-red",
    bg: "bg-aegis-red/10 border-aegis-red/30",
    label: "PARKING EXPIRED",
  },
  UNKNOWN: {
    icon: HelpCircle,
    color: "text-aegis-yellow",
    bg: "bg-aegis-yellow/10 border-aegis-yellow/30",
    label: "STATUS UNKNOWN",
  },
};

export function ScanResults({
  detections,
  rawText,
  onNewScan,
}: ScanResultsProps) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 20 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs tracking-[0.2em] text-aegis-cyan">
          SCAN RESULTS — {detections.length} PLATE(S) DETECTED
        </h3>
      </div>

      {detections.length === 0 && (
        <div className="glass-panel rounded-lg p-6 text-center">
          <p className="font-mono text-sm text-aegis-muted">
            No plate patterns detected
          </p>
          {rawText && (
            <p className="text-[10px] font-mono text-aegis-muted/60 mt-2">
              Raw OCR: &quot;{rawText.slice(0, 80)}&quot;
            </p>
          )}
        </div>
      )}

      {detections.map((d, i) => {
        const sc = statusConfig[d.parkingStatus];
        const StatusIcon = sc.icon;
        return (
          <motion.div
            key={d.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel rounded-lg p-4 space-y-3"
          >
            {/* Plate text display */}
            <div className="flex items-center justify-between">
              <div className="px-4 py-2 bg-aegis-bg rounded border border-aegis-border">
                <span className="font-mono text-xl font-bold tracking-[0.2em] text-white">
                  {d.plateText}
                </span>
              </div>
              <ConfidenceBadge confidence={d.confidence} size="lg" />
            </div>

            <ConfidenceBar confidence={d.confidence} />

            {/* Parking status */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded border ${sc.bg}`}
            >
              <StatusIcon size={16} className={sc.color} />
              <span className={`font-mono text-xs tracking-wider ${sc.color}`}>
                {sc.label}
              </span>
            </div>

            {/* Word-level confidence */}
            {d.rawWords.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-aegis-muted tracking-wider">
                  WORD CONFIDENCE BREAKDOWN
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {d.rawWords.slice(0, 8).map((w, j) => (
                    <span
                      key={j}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-aegis-bg border border-aegis-border/50"
                    >
                      {w.text}{" "}
                      <span className="text-aegis-muted">
                        {w.confidence.toFixed(0)}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}

      <div className="flex justify-center pt-2">
        <GlowButton onClick={onNewScan} variant="ghost">
          <RotateCcw size={14} />
          NEW SCAN
        </GlowButton>
      </div>
    </motion.div>
  );
}
