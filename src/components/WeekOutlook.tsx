"use client";

import React from "react";
import type { DayOutlook } from "@/lib/outlook";

interface Props {
  days: DayOutlook[];
  use24h?: boolean;
  onDaySelect?: (dayOffset: number) => void;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-emerald-500/15 border-emerald-500/30";
  if (score >= 5) return "bg-amber-400/10 border-amber-400/25";
  return "bg-red-500/10 border-red-500/25";
}

/** Map WMO weather code to a simple emoji */
function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤";
  if (code <= 3) return "☁️";
  if (code <= 49) return "🌫";
  if (code <= 59) return "🌧";
  if (code <= 69) return "🌨";
  if (code <= 79) return "🌨";
  if (code <= 82) return "🌧";
  if (code <= 84) return "🌨";
  if (code <= 99) return "⛈";
  return "🌤";
}

function formatPeakHour(date: Date | null, use24h: boolean): string {
  if (!date) return "";
  const h = date.getHours();
  if (use24h) return `${h.toString().padStart(2, "0")}:00`;
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export function WeekOutlook({ days, use24h = false, onDaySelect }: Props) {
  if (!days.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-0.5">
        This Week
      </p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => onDaySelect?.(i)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border py-2 px-0.5 transition-colors ${scoreBg(day.peakScore)} active:opacity-70`}
          >
            <span className="text-[9px] text-white/40 font-medium truncate w-full text-center">
              {day.dayName === "Today" ? "Today" : day.dayName}
            </span>
            <span className="text-[11px]">{weatherEmoji(day.weatherCode)}</span>
            <span className={`text-base font-bold leading-none ${scoreColor(day.peakScore)}`}>
              {day.peakScore}
            </span>
            {day.peakHour && day.peakScore >= 7 ? (
              <span className="text-[8px] text-white/30 leading-none">
                {formatPeakHour(day.peakHour, use24h)}
              </span>
            ) : (
              <span className="text-[8px] text-transparent leading-none">·</span>
            )}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-white/20 px-0.5">Tap a day to explore · Peak score shown</p>
    </div>
  );
}
