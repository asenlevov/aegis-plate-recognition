"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface GlowButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "danger" | "ghost";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

const variants = {
  primary: {
    bg: "bg-aegis-cyan/10 hover:bg-aegis-cyan/20 border-aegis-cyan/40",
    text: "text-aegis-cyan",
    glow: "hover:shadow-[0_0_20px_rgba(0,229,255,0.3)]",
  },
  danger: {
    bg: "bg-aegis-red/10 hover:bg-aegis-red/20 border-aegis-red/40",
    text: "text-aegis-red",
    glow: "hover:shadow-[0_0_20px_rgba(255,23,68,0.3)]",
  },
  ghost: {
    bg: "bg-transparent hover:bg-white/5 border-aegis-border",
    text: "text-aegis-muted hover:text-aegis-text",
    glow: "",
  },
};

export function GlowButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  type = "button",
}: GlowButtonProps) {
  const v = variants[variant];
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 px-5 py-2.5
        font-mono text-xs tracking-widest uppercase
        border rounded-md transition-all duration-200
        disabled:opacity-40 disabled:pointer-events-none
        ${v.bg} ${v.text} ${v.glow} ${className}
      `}
    >
      {children}
    </motion.button>
  );
}
