"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatTime } from "@/lib/utils";

interface PressurePoint {
  time: number; // unix ms
  hPa: number;
}

interface PressureChartProps {
  data: PressurePoint[];
  trendLabel: string;
  implication: string;
  use24h?: boolean;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-lg px-3 py-2 text-xs">
      <p className="text-white/60">{new Date(label).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}</p>
      <p className="text-emerald-300 font-medium">{payload[0].value.toFixed(1)} hPa</p>
    </div>
  );
}

export function PressureChart({ data, trendLabel, implication, use24h = false }: PressureChartProps) {
  const nowMs = Date.now();
  const pressures = data.map((d) => d.hPa).filter(Boolean);
  const avg = pressures.reduce((a, b) => a + b, 0) / pressures.length;
  const domain: [number, number] = [Math.floor(avg - 12), Math.ceil(avg + 12)];

  // Sample every 6h for X axis tick labels
  const tickTimes = data
    .filter((_, i) => i % 6 === 0)
    .map((d) => d.time);

  const chartData = data.map((d) => ({ time: d.time, hPa: d.hPa }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/70">{trendLabel}</span>
        <span className="text-xs text-white/40">{pressures.at(-1)?.toFixed(1)} hPa</span>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={tickTimes}
            tickFormatter={(t) => formatTime(new Date(t), use24h)}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={domain}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            tickCount={3}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={nowMs}
            stroke="rgba(255,255,255,0.25)"
            strokeDasharray="3 3"
            label={{ value: "Now", fill: "rgba(255,255,255,0.35)", fontSize: 9, position: "insideTopRight" }}
          />
          <Area
            type="monotone"
            dataKey="hPa"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#pressureGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#10b981" }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-xs text-white/40 leading-relaxed">{implication}</p>
    </div>
  );
}
