"use client";

import React from "react";
import type { ScoredFactors, PressureTrend } from "@/lib/score";
import type { SolunarWindow } from "@/lib/solunar";

interface Props {
  factors: ScoredFactors;
  pressureTrend: PressureTrend;
  windKmh: number;
  airTempC: number;
  moonFraction: number;
  solunarWindows: SolunarWindow[];
  now: Date;
}

function Bar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-500";
  return (
    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const PRESSURE_DESC: Record<PressureTrend, string> = {
  stable:         "Stable — consistent feeding behaviour",
  rising:         "Slowly rising — activity picking up",
  rapidlyRising:  "Rapidly rising — short burst of activity",
  falling:        "Falling — aggressive feeding ahead of front",
  rapidlyFalling: "Rapidly falling — excellent pre-front window",
};

function getSolunarDesc(windows: SolunarWindow[], now: Date): string {
  const nowMs = now.getTime();
  const active = windows.find((w) => nowMs >= w.start.getTime() && nowMs <= w.end.getTime());
  if (active) {
    return active.type === "major" ? "In major window now" : "In minor window now";
  }
  const upcoming = windows
    .filter((w) => w.start.getTime() > nowMs)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  if (!upcoming) return "No more windows today";
  const minsAway = Math.round((upcoming.start.getTime() - nowMs) / 60_000);
  if (minsAway < 60) {
    return `${upcoming.type === "major" ? "Major" : "Minor"} window in ${minsAway}m`;
  }
  const hrsAway = Math.round(minsAway / 60);
  return `${upcoming.type === "major" ? "Major" : "Minor"} window in ${hrsAway}h`;
}

function getWindDesc(kmh: number): string {
  const rounded = Math.round(kmh);
  if (kmh <= 10) return `${rounded} km/h — calm`;
  if (kmh <= 15) return `${rounded} km/h — light breeze`;
  if (kmh <= 25) return `${rounded} km/h — moderate`;
  if (kmh <= 35) return `${rounded} km/h — strong`;
  return `${rounded} km/h — dangerous`;
}

function getTempDesc(tempC: number): string {
  return `${tempC.toFixed(1)}°C air temperature`;
}

function getMoonDesc(fraction: number): string {
  const pct = Math.round(fraction * 100);
  let phase = "quarter";
  if (pct <= 5) phase = "new moon";
  else if (pct <= 25) phase = "crescent";
  else if (pct <= 45) phase = "quarter";
  else if (pct <= 55) phase = "half";
  else if (pct <= 75) phase = "gibbous";
  else if (pct <= 95) phase = "gibbous";
  else phase = "full moon";
  return `${pct}% illuminated — ${phase}`;
}

const ROWS: Array<{
  key: keyof ScoredFactors;
  icon: string;
  label: string;
  max: number;
}> = [
  { key: "pressure", icon: "📊", label: "Pressure",    max: 3.5 },
  { key: "solunar",  icon: "🌙", label: "Solunar",     max: 2.5 },
  { key: "wind",     icon: "💨", label: "Wind",        max: 2.0 },
  { key: "temp",     icon: "🌡", label: "Temperature", max: 1.5 },
  { key: "moon",     icon: "🌕", label: "Moon phase",  max: 0.5 },
];

export function ScoreBreakdown({
  factors,
  pressureTrend,
  windKmh,
  airTempC,
  moonFraction,
  solunarWindows,
  now,
}: Props) {
  const descs: Record<keyof ScoredFactors, string> = {
    pressure: PRESSURE_DESC[pressureTrend],
    solunar:  getSolunarDesc(solunarWindows, now),
    wind:     getWindDesc(windKmh),
    temp:     getTempDesc(airTempC),
    moon:     getMoonDesc(moonFraction),
  };

  return (
    <div className="space-y-2.5 pt-3 border-t border-white/8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">Why?</p>
      {ROWS.map(({ key, icon, label, max }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-sm w-5 text-center shrink-0">{icon}</span>
          <span className="text-xs text-white/50 w-20 shrink-0">{label}</span>
          <Bar score={factors[key]} max={max} />
          <span className="text-xs text-white/45 text-right min-w-0 flex-1 truncate">{descs[key]}</span>
        </div>
      ))}
    </div>
  );
}
