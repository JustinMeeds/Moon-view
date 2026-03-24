"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SolunarWindow } from "@/lib/solunar";
import { formatTime } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";

interface SolunarChartProps {
  windows: SolunarWindow[];
  now: Date;
  use24h?: boolean;
}

export function SolunarChart({ windows, now, use24h = false }: SolunarChartProps) {
  const nowMs = now.getTime();

  // Build chart data: 15-min buckets across the day, height = activity level
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const buckets: { t: number; val: number }[] = [];

  for (let i = 0; i < 96; i++) {
    const tMs = dayStartMs + i * 15 * 60 * 1000;
    let val = 0;
    for (const w of windows) {
      if (tMs >= w.start.getTime() && tMs < w.end.getTime()) {
        val = w.type === "major" ? 2 : 1;
        break;
      }
    }
    buckets.push({ t: tMs, val });
  }

  // Tick labels every 6h
  const ticks = [0, 24, 48, 72].map((i) => dayStartMs + i * 15 * 60 * 1000);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={70}>
        <BarChart data={buckets} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap={1}>
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[dayStartMs, dayStartMs + 24 * 60 * 60 * 1000]}
            ticks={ticks}
            tickFormatter={(t) => formatTime(new Date(t), use24h)}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine
            x={nowMs}
            stroke="rgba(255,255,255,0.35)"
            strokeDasharray="3 3"
          />
          <Bar dataKey="val" radius={[1, 1, 0, 0]}>
            {buckets.map((b) => {
              const active = nowMs >= b.t && nowMs < b.t + 15 * 60 * 1000;
              const color =
                b.val === 2
                  ? active ? "#34d399" : "rgba(52,211,153,0.6)"
                  : b.val === 1
                  ? active ? "#a3e635" : "rgba(163,230,53,0.45)"
                  : "rgba(255,255,255,0.06)";
              return <Cell key={b.t} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Window list */}
      <div className="space-y-2">
        {windows.map((w) => {
          const passed = w.end.getTime() < nowMs;
          const active = nowMs >= w.start.getTime() && nowMs <= w.end.getTime();
          const msUntil = w.start.getTime() - nowMs;

          return (
            <div
              key={w.start.toISOString()}
              className={`flex items-center gap-3 text-sm ${passed ? "opacity-40" : ""}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${w.type === "major" ? "bg-emerald-400" : "border border-emerald-400 bg-transparent"}`} />
              <span className="font-medium text-white/80 w-14 shrink-0">
                {w.type === "major" ? "Major" : "Minor"}
              </span>
              <span className="text-white/50 flex-1">
                {formatTime(w.start, use24h)}–{formatTime(w.end, use24h)}
              </span>
              <span className={`text-xs shrink-0 ${active ? "text-emerald-400 font-semibold" : "text-white/40"}`}>
                {passed
                  ? "passed"
                  : active
                  ? "active now"
                  : `in ${formatDuration(msUntil)}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
