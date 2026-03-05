"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ScanLine, FileText } from "lucide-react";

const links = [
  { href: "/", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/scan", label: "SCAN", icon: ScanLine },
  { href: "/results", label: "INTEL", icon: FileText },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-aegis-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                active
                  ? "text-aegis-cyan"
                  : "text-aegis-muted hover:text-aegis-text"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span
                className={`text-[10px] font-mono tracking-widest ${
                  active ? "glow-text" : ""
                }`}
              >
                {label}
              </span>
              {active && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-aegis-cyan rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
