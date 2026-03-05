"use client";

import { Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { HUDCard } from "@/components/ui/HUDCard";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { useAegisStore } from "@/lib/store";

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const statusColors = {
  VALID: "text-aegis-green",
  EXPIRED: "text-aegis-red",
  UNKNOWN: "text-aegis-yellow",
};

export function RecentFeed() {
  const detections = useAegisStore((s) => s.detections);
  const recent = detections.slice(0, 5);

  if (recent.length === 0) {
    return (
      <HUDCard title="Recent Detections">
        <div className="flex flex-col items-center justify-center py-8 text-aegis-muted">
          <Clock size={24} className="mb-2 opacity-40" />
          <p className="text-xs font-mono">NO DETECTIONS YET</p>
          <p className="text-[10px] mt-1 opacity-60">Start a scan to populate the feed</p>
        </div>
      </HUDCard>
    );
  }

  return (
    <HUDCard title="Recent Detections">
      <div className="space-y-2">
        {recent.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 p-2 rounded bg-aegis-bg/40 border border-aegis-border/20 hover:border-aegis-cyan/20 transition-colors"
          >
            <div className="w-10 h-10 rounded overflow-hidden border border-aegis-border/30 flex-shrink-0">
              <img
                src={d.imageDataUrl}
                alt={d.plateText}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold tracking-wider">
                  {d.plateText}
                </span>
                <span
                  className={`text-[10px] font-mono ${statusColors[d.parkingStatus]}`}
                >
                  {d.parkingStatus}
                </span>
              </div>
              <span className="text-[10px] text-aegis-muted font-mono">
                {timeAgo(d.timestamp)}
              </span>
            </div>
            <ConfidenceBadge confidence={d.confidence} size="sm" />
          </div>
        ))}
      </div>
      {detections.length > 5 && (
        <Link
          href="/results"
          className="flex items-center justify-center gap-1 mt-3 text-[11px] font-mono text-aegis-cyan hover:underline"
        >
          VIEW ALL INTEL <ChevronRight size={12} />
        </Link>
      )}
    </HUDCard>
  );
}
