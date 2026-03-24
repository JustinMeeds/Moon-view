"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fish, Moon, Cloud, BookOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",            label: "Home",       Icon: Fish     },
  { href: "/moon",        label: "Moon",       Icon: Moon     },
  { href: "/conditions",  label: "Conditions", Icon: Cloud    },
  { href: "/regulations", label: "Regs",       Icon: BookOpen },
  { href: "/species",     label: "Species",    Icon: Layers   },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t bg-slate-950/90 border-white/10 safe-area-bottom">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-medium transition-colors",
                active
                  ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
