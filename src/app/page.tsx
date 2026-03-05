"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScanLine, Crosshair, Shield } from "lucide-react";
import { StatusPanel } from "@/components/dashboard/StatusPanel";
import { RecentFeed } from "@/components/dashboard/RecentFeed";
import { GlowButton } from "@/components/ui/GlowButton";

export default function DashboardPage() {
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="relative">
          <Shield size={32} className="text-aegis-cyan" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-aegis-green rounded-full animate-status-pulse" />
        </div>
        <div>
          <h1 className="font-mono text-lg font-bold tracking-[0.15em] glow-text">
            AEGIS
          </h1>
          <p className="text-[10px] font-mono text-aegis-muted tracking-[0.2em]">
            AERIAL ENGAGEMENT & GRID ID SYSTEM
          </p>
        </div>
      </motion.div>

      {/* Classification banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center py-1.5 border border-aegis-red/30 rounded bg-aegis-red/5"
      >
        <span className="text-[10px] font-mono tracking-[0.3em] text-aegis-red animate-flicker">
          CLASSIFIED — DELTA DEFENSE SYSTEMS
        </span>
      </motion.div>

      <StatusPanel />

      {/* Quick scan CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <Link href="/scan">
          <GlowButton className="py-4 px-8 text-sm">
            <Crosshair size={18} />
            INITIATE SCAN
          </GlowButton>
        </Link>
      </motion.div>

      <RecentFeed />

      {/* Decorative telemetry */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-between text-[9px] font-mono text-aegis-muted/50 px-1"
      >
        <span>SYS.UPTIME: {new Date().toISOString().slice(0, 10)}</span>
        <span>LAT: 38.8977 | LON: -77.0365</span>
        <span>
          <ScanLine size={10} className="inline mr-1" />
          OCR.v5
        </span>
      </motion.div>
    </div>
  );
}
