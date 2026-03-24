"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface FishingScoreProps {
  score: number;
  reason: string;
  bestToday?: { score: number; time: Date } | null;
  use24h?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function scoreGlow(score: number): string {
  if (score >= 8) return "drop-shadow-[0_0_16px_rgba(52,211,153,0.5)]";
  if (score >= 5) return "drop-shadow-[0_0_16px_rgba(251,191,36,0.4)]";
  return "drop-shadow-[0_0_16px_rgba(248,113,113,0.4)]";
}

function scoreLabel(score: number): string {
  if (score >= 9) return "Exceptional conditions";
  if (score >= 8) return "Great conditions to fish";
  if (score >= 6) return "Good conditions to fish";
  if (score >= 5) return "Fair conditions";
  if (score >= 3) return "Slow conditions";
  return "Poor conditions";
}

export function FishingScore({ score, reason, bestToday, use24h = false }: FishingScoreProps) {
  const color = scoreColor(score);
  const glow = scoreGlow(score);

  return (
    <div className="flex flex-col items-center py-4 gap-1">
      {/* Score display */}
      <div className="flex items-end gap-1">
        <span className={`text-7xl font-bold leading-none tracking-tight ${color} ${glow}`}>
          {score}
        </span>
        <span className="text-2xl font-light text-white/30 mb-2">/10</span>
      </div>

      {/* Label */}
      <p className="text-sm font-medium text-white/70">{scoreLabel(score)}</p>

      {/* Reason string */}
      <p className="text-xs text-white/45 text-center max-w-xs px-2 leading-relaxed">{reason}</p>

      {/* Best-today callout */}
      {bestToday && bestToday.score > score && (
        <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-300 font-medium">
            Best today: {bestToday.score}/10 at {formatTime(bestToday.time, use24h)}
          </span>
        </div>
      )}
    </div>
  );
}
