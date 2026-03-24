import React from "react";
import { AlertTriangle } from "lucide-react";
import type { SpecialWater } from "@/lib/regulations";

interface SpecialWaterWarningProps {
  water: SpecialWater;
  onDetails?: () => void;
}

export function SpecialWaterWarning({ water, onDetails }: SpecialWaterWarningProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-300">Special Regulation Water Nearby</p>
        <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
          <span className="font-medium text-white/80">{water.name}</span> — {water.description}
        </p>
      </div>
      {onDetails && (
        <button
          onClick={onDetails}
          className="shrink-0 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
        >
          Details
        </button>
      )}
    </div>
  );
}
