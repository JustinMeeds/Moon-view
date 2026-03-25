"use client";

import React, { useRef, useEffect } from "react";
import type { SolunarWindow } from "@/lib/solunar";

interface HourScore {
  time: Date;
  score: number;
}

interface Props {
  hourScores: HourScore[];
  solunarWindows: SolunarWindow[];
  now: Date;
  use24h?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 5) return "bg-amber-400";
  return "bg-red-500/70";
}

function scoreTextColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

function formatHour(date: Date, use24h: boolean): string {
  if (use24h) {
    return `${date.getHours().toString().padStart(2, "0")}`;
  }
  const h = date.getHours();
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function isInWindow(time: Date, windows: SolunarWindow[]): "major" | "minor" | null {
  const ms = time.getTime();
  for (const w of windows) {
    if (ms >= w.start.getTime() && ms <= w.end.getTime()) {
      return w.type;
    }
  }
  return null;
}

export function DayTimeline({ hourScores, solunarWindows, now, use24h = false }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);

  // Scroll to current hour on mount
  useEffect(() => {
    if (currentRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = currentRef.current;
      const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollLeft = Math.max(0, offset);
    }
  }, []);

  const peak = hourScores.reduce(
    (best, h) => (h.score > best.score ? h : best),
    hourScores[0]
  );

  if (!hourScores.length) return null;

  const BAR_MAX_H = 40; // px

  return (
    <div className="space-y-2">
      {/* Peak label */}
      {peak && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Today</p>
          <p className={`text-[11px] font-medium ${scoreTextColor(peak.score)}`}>
            Peak {peak.score}/10 at {formatHour(peak.time, use24h)}{use24h ? ":00" : ""}
          </p>
        </div>
      )}

      {/* Scrollable bar chart */}
      <div ref={scrollRef} className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex items-end gap-1" style={{ minWidth: "max-content" }}>
          {hourScores.map((h, i) => {
            const isCurrent =
              Math.abs(h.time.getTime() - now.getTime()) < 30 * 60 * 1000;
            const windowType = isInWindow(h.time, solunarWindows);
            const barH = Math.max(6, Math.round((h.score / 10) * BAR_MAX_H));

            return (
              <div
                key={i}
                ref={isCurrent ? currentRef : undefined}
                className="flex flex-col items-center gap-1"
                style={{ width: 28 }}
              >
                {/* Solunar indicator */}
                <div className="h-1 w-full rounded-full">
                  {windowType === "major" && (
                    <div className="h-full w-full bg-yellow-400/60 rounded-full" />
                  )}
                  {windowType === "minor" && (
                    <div className="h-full w-full bg-yellow-400/25 rounded-full" />
                  )}
                </div>

                {/* Bar */}
                <div
                  className="w-5 rounded-t-sm relative"
                  style={{ height: BAR_MAX_H }}
                >
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all ${scoreColor(h.score)} ${isCurrent ? "ring-1 ring-white/50" : ""}`}
                    style={{ height: barH }}
                  />
                </div>

                {/* Hour label */}
                <span className={`text-[9px] ${isCurrent ? "text-white/80 font-semibold" : "text-white/30"}`}>
                  {formatHour(h.time, use24h)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[9px] text-white/25 px-0.5">
        <span className="flex items-center gap-1">
          <span className="w-2 h-1.5 bg-yellow-400/60 rounded-full inline-block" /> Major window
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-1.5 bg-yellow-400/25 rounded-full inline-block" /> Minor window
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1 h-3 bg-white/30 rounded inline-block ring-1 ring-white/50" /> Now
        </span>
      </div>
    </div>
  );
}
