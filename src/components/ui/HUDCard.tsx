"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface HUDCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  glowColor?: string;
}

export function HUDCard({
  children,
  title,
  className = "",
  glowColor = "rgba(0,229,255,0.08)",
}: HUDCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative glass-panel rounded-lg hud-corners overflow-hidden ${className}`}
      style={{ boxShadow: `0 0 24px ${glowColor}` }}
    >
      {title && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-aegis-border/50">
          <div className="w-1.5 h-1.5 rounded-full bg-aegis-cyan animate-status-pulse" />
          <span className="text-[11px] font-mono tracking-[0.2em] text-aegis-cyan uppercase">
            {title}
          </span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </motion.div>
  );
}
