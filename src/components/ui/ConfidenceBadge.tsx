"use client";

interface ConfidenceBadgeProps {
  confidence: number;
  size?: "sm" | "md" | "lg";
}

function getColor(c: number) {
  if (c >= 85) return { bg: "bg-aegis-green/15", text: "text-aegis-green", bar: "bg-aegis-green" };
  if (c >= 60) return { bg: "bg-aegis-yellow/15", text: "text-aegis-yellow", bar: "bg-aegis-yellow" };
  return { bg: "bg-aegis-red/15", text: "text-aegis-red", bar: "bg-aegis-red" };
}

const sizes = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
  lg: "text-sm px-3 py-1.5",
};

export function ConfidenceBadge({ confidence, size = "md" }: ConfidenceBadgeProps) {
  const { bg, text } = getColor(confidence);
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono rounded ${bg} ${text} ${sizes[size]}`}>
      <span className="tracking-wider">{confidence.toFixed(1)}%</span>
    </span>
  );
}

export function ConfidenceBar({ confidence }: { confidence: number }) {
  const { bar } = getColor(confidence);
  return (
    <div className="w-full h-1.5 rounded-full bg-aegis-border/50 overflow-hidden">
      <div
        className={`h-full rounded-full animate-fill-bar ${bar}`}
        style={{ width: `${Math.min(confidence, 100)}%` }}
      />
    </div>
  );
}
