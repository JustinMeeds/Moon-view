"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, BarChart2, CalendarDays, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Now", icon: Moon },
  { href: "/tonight", label: "Tonight", icon: BarChart2 },
  { href: "/explore", label: "Explore", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-t border-white/10 safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
                active ? "text-indigo-400" : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_rgba(129,140,248,0.8)]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
