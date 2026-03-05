"use client";

import { Shield, Wifi, Cpu, Eye } from "lucide-react";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { HUDCard } from "@/components/ui/HUDCard";
import { useAegisStore } from "@/lib/store";

export function StatusPanel() {
  const detections = useAegisStore((s) => s.detections);
  const totalScans = detections.length;
  const avgConfidence =
    totalScans > 0
      ? detections.reduce((s, d) => s + d.confidence, 0) / totalScans
      : 0;

  return (
    <HUDCard title="System Status">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-aegis-cyan" />
            <span className="font-mono text-sm">AEGIS v1.0</span>
          </div>
          <StatusIndicator status="operational" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            icon={<Eye size={14} />}
            label="SCANS"
            value={totalScans.toString()}
          />
          <StatBlock
            icon={<Cpu size={14} />}
            label="AVG CONF"
            value={avgConfidence > 0 ? `${avgConfidence.toFixed(1)}%` : "—"}
          />
          <StatBlock
            icon={<Wifi size={14} />}
            label="LINK"
            value="ACTIVE"
          />
        </div>
      </div>
    </HUDCard>
  );
}

function StatBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 rounded bg-aegis-bg/60 border border-aegis-border/30">
      <div className="text-aegis-cyan">{icon}</div>
      <span className="text-[10px] font-mono text-aegis-muted tracking-wider">
        {label}
      </span>
      <span className="text-sm font-mono font-semibold">{value}</span>
    </div>
  );
}
