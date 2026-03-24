"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, BarChart2, CalendarDays, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

const NAV_ITEMS = [
  { href: "/",         label: "Now",      icon: Moon },
  { href: "/tonight",  label: "Tonight",  icon: BarChart2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { preferences } = useApp();
  const { nightMode } = preferences;

  const activeColor   = nightMode ? "text-[#ff3300]"          : "text-indigo-400";
  const inactiveColor = nightMode ? "text-[rgba(180,30,0,0.45)]" : "text-white/40";
  const glowClass     = nightMode
    ? "drop-shadow-[0_0_6px_rgba(255,50,0,0.9)]"
    : "drop-shadow-[0_0_6px_rgba(129,140,248,0.8)]";
  const navBg         = nightMode ? "bg-[rgba(0,0,0,0.97)] border-[rgba(180,0,0,0.2)]" : "bg-slate-950/90 border-white/10";

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t safe-area-bottom ${navBg}`}>
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
                active ? activeColor : `${inactiveColor} hover:${nightMode ? "text-[rgba(220,50,0,0.7)]" : "text-white/70"}`
              )}
            >
              <Icon className={cn("w-5 h-5", active && glowClass)} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
