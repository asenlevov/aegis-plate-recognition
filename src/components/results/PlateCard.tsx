"use client";

import { motion } from "framer-motion";
import { Check, AlertTriangle, HelpCircle, ZoomIn } from "lucide-react";
import { ConfidenceBadge, ConfidenceBar } from "@/components/ui/ConfidenceBadge";
import type { PlateDetection } from "@/lib/store";

interface PlateCardProps {
  detection: PlateDetection;
  index: number;
  onZoom: (detection: PlateDetection) => void;
}

const statusIcons = {
  VALID: Check,
  EXPIRED: AlertTriangle,
  UNKNOWN: HelpCircle,
};

const statusColors = {
  VALID: "text-aegis-green",
  EXPIRED: "text-aegis-red",
  UNKNOWN: "text-aegis-yellow",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function PlateCard({ detection: d, index, onZoom }: PlateCardProps) {
  const StatusIcon = statusIcons[d.parkingStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-panel rounded-lg overflow-hidden"
    >
      {/* Image with zoom button */}
      <div className="relative aspect-video bg-aegis-bg">
        <img
          src={d.imageDataUrl}
          alt={d.plateText}
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => onZoom(d)}
          className="absolute top-2 right-2 p-1.5 rounded bg-aegis-bg/70 border border-aegis-border text-aegis-cyan hover:bg-aegis-cyan/20 transition-colors"
        >
          <ZoomIn size={14} />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-aegis-bg/90 to-transparent h-8" />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-base font-bold tracking-[0.15em]">
            {d.plateText}
          </span>
          <ConfidenceBadge confidence={d.confidence} size="sm" />
        </div>

        <ConfidenceBar confidence={d.confidence} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusIcon size={12} className={statusColors[d.parkingStatus]} />
            <span
              className={`text-[10px] font-mono tracking-wider ${statusColors[d.parkingStatus]}`}
            >
              {d.parkingStatus}
            </span>
          </div>
          <span className="text-[10px] font-mono text-aegis-muted">
            {formatTime(d.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
