"use client";

type Status = "operational" | "scanning" | "error" | "idle";

const config: Record<Status, { color: string; label: string }> = {
  operational: { color: "bg-aegis-green", label: "OPERATIONAL" },
  scanning: { color: "bg-aegis-cyan", label: "SCANNING" },
  error: { color: "bg-aegis-red", label: "ERROR" },
  idle: { color: "bg-aegis-muted", label: "IDLE" },
};

export function StatusIndicator({ status }: { status: Status }) {
  const { color, label } = config[status];
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`relative flex h-2.5 w-2.5`}>
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${color}`}
        />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
      </span>
      <span className="text-[11px] font-mono tracking-[0.25em] text-aegis-muted">
        {label}
      </span>
    </div>
  );
}
