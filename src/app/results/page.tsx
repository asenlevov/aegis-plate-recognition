"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Trash2, Filter, SortDesc } from "lucide-react";
import { PlateCard } from "@/components/results/PlateCard";
import { ZoomViewer } from "@/components/results/ZoomViewer";
import { GlowButton } from "@/components/ui/GlowButton";
import { useAegisStore, type PlateDetection } from "@/lib/store";

type SortBy = "time" | "confidence";
type FilterBy = "all" | "high" | "medium" | "low";

export default function ResultsPage() {
  const { detections, clearDetections } = useAegisStore();
  const [zoomTarget, setZoomTarget] = useState<PlateDetection | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("time");
  const [filterBy, setFilterBy] = useState<FilterBy>("all");

  const filtered = useMemo(() => {
    let items = [...detections];

    if (filterBy === "high") items = items.filter((d) => d.confidence >= 85);
    else if (filterBy === "medium")
      items = items.filter((d) => d.confidence >= 60 && d.confidence < 85);
    else if (filterBy === "low") items = items.filter((d) => d.confidence < 60);

    if (sortBy === "confidence") items.sort((a, b) => b.confidence - a.confidence);
    else items.sort((a, b) => b.timestamp - a.timestamp);

    return items;
  }, [detections, sortBy, filterBy]);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-aegis-cyan" />
          <h1 className="font-mono text-sm tracking-[0.2em] text-aegis-cyan">
            INTEL FEED
          </h1>
          <span className="text-[10px] font-mono text-aegis-muted ml-1">
            ({detections.length})
          </span>
        </div>
        {detections.length > 0 && (
          <GlowButton variant="danger" onClick={clearDetections}>
            <Trash2 size={12} />
            CLEAR
          </GlowButton>
        )}
      </motion.div>

      {/* Filters */}
      {detections.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          <div className="flex items-center gap-1 mr-2">
            <Filter size={12} className="text-aegis-muted" />
          </div>
          {(["all", "high", "medium", "low"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterBy(f)}
              className={`text-[10px] font-mono tracking-wider px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
                filterBy === f
                  ? "border-aegis-cyan/40 bg-aegis-cyan/10 text-aegis-cyan"
                  : "border-aegis-border text-aegis-muted hover:text-aegis-text"
              }`}
            >
              {f === "all"
                ? "ALL"
                : f === "high"
                ? "HIGH >85%"
                : f === "medium"
                ? "MED 60-85%"
                : "LOW <60%"}
            </button>
          ))}
          <div className="w-px h-4 bg-aegis-border mx-1" />
          <button
            onClick={() => setSortBy((s) => (s === "time" ? "confidence" : "time"))}
            className="flex items-center gap-1 text-[10px] font-mono tracking-wider px-2.5 py-1 rounded border border-aegis-border text-aegis-muted hover:text-aegis-text transition-colors whitespace-nowrap"
          >
            <SortDesc size={10} />
            {sortBy === "time" ? "TIME" : "CONF"}
          </button>
        </motion.div>
      )}

      {/* Results grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-aegis-muted"
        >
          <FileText size={32} className="mb-3 opacity-30" />
          <p className="text-xs font-mono">
            {detections.length === 0
              ? "NO INTEL AVAILABLE"
              : "NO RESULTS MATCH FILTER"}
          </p>
          <p className="text-[10px] mt-1 opacity-50 font-mono">
            {detections.length === 0
              ? "Run a scan to populate the intel feed"
              : "Try adjusting filter criteria"}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((d, i) => (
            <PlateCard
              key={d.id}
              detection={d}
              index={i}
              onZoom={setZoomTarget}
            />
          ))}
        </div>
      )}

      {/* Zoom viewer modal */}
      <AnimatePresence>
        {zoomTarget && (
          <ZoomViewer
            detection={zoomTarget}
            onClose={() => setZoomTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
