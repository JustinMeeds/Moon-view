"use client";

import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";

/** Fixed top-right quick-toggle for night mode — always accessible. */
export function NightToggle() {
  const { preferences, setPreferences } = useApp();
  const { nightMode } = preferences;

  return (
    <button
      onClick={() => setPreferences({ nightMode: !nightMode })}
      title={nightMode ? "Exit night mode" : "Enter night mode"}
      className={cn(
        "fixed z-50 right-4 flex items-center justify-center rounded-full w-9 h-9 transition-colors",
        nightMode
          ? "bg-[rgba(120,0,0,0.4)] text-[#ff3300] border border-[rgba(180,0,0,0.4)]"
          : "bg-white/10 text-white/60 border border-white/10 hover:bg-white/20 hover:text-white"
      )}
      style={{ top: "max(env(safe-area-inset-top, 0px) + 10px, 18px)" }}
    >
      {nightMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
    </button>
  );
}
