"use client";

import React from "react";
import { MapPin, Navigation, Clock, AlertTriangle, Pencil } from "lucide-react";
import type { FmzSource } from "@/context/AppContext";
import { fmzLabel, fmzName } from "@/lib/fmz";

interface FMZBannerProps {
  fmz: number | null;
  source: FmzSource | null;
  onChangeZone: () => void;
}

export function FMZBanner({ fmz, source, onChangeZone }: FMZBannerProps) {
  // Zone unconfirmed
  if (!fmz) {
    return (
      <button
        onClick={onChangeZone}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm"
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">Zone unconfirmed — tap to set your FMZ</span>
      </button>
    );
  }

  const isStale = source === "stale";
  const isManual = source === "manual";

  const SourceIcon = isStale ? Clock : isManual ? Pencil : Navigation;
  const sourceLabel = isStale ? "last detected" : isManual ? "manual" : "GPS";
  const borderColor = isStale ? "border-amber-500/30" : "border-white/10";
  const bgColor = isStale ? "bg-amber-500/10" : "bg-white/5";
  const textColor = isStale ? "text-amber-300" : "text-white/90";

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${bgColor} border ${borderColor}`}>
      <MapPin className="w-4 h-4 shrink-0 text-emerald-400" />
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${textColor}`}>
          {fmzName(fmz)} · {fmzLabel(fmz)}
        </span>
        <span className="ml-2 text-xs text-white/40 inline-flex items-center gap-1">
          <SourceIcon className="w-3 h-3" />
          {sourceLabel}
        </span>
      </div>
      <button
        onClick={onChangeZone}
        className="shrink-0 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors px-1"
      >
        Change
      </button>
    </div>
  );
}
