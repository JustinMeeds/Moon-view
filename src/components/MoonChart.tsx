"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { ChartPoint } from "@/lib/moon";
import { formatTime } from "@/lib/utils";

interface MoonChartProps {
  data: ChartPoint[];
  moonrise: Date | null;
  moonset: Date | null;
  peak: ChartPoint | null;
  use24h: boolean;
  onScrub?: (point: ChartPoint) => void;
}

function tickFormatter(timestamp: number, use24h: boolean) {
  return formatTime(new Date(timestamp), use24h);
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  use24h,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  use24h: boolean;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs shadow-xl">
      <div className="text-white/60 mb-1">{formatTime(p.time, use24h)}</div>
      <div className="text-white font-semibold">
        {p.altitudeDeg >= 0 ? "+" : ""}{p.altitudeDeg.toFixed(1)}°
      </div>
      <div className="text-indigo-300">{p.cardinal} {p.azimuthDeg.toFixed(0)}°</div>
    </div>
  );
}

export function MoonChart({ data, moonrise, moonset, peak, use24h, onScrub }: MoonChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  // Reduce tick density for mobile
  const tickData = data.filter((_, i) => i % 4 === 0);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = parseInt(e.target.value, 10);
      setActiveIndex(idx);
      onScrub?.(data[idx]);
    },
    [data, onScrub]
  );

  const activePoint = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            onMouseMove={(e) => {
              const idx = e.activeTooltipIndex;
              if (typeof idx === "number" && idx >= 0 && idx < data.length) {
                setActiveIndex(idx);
                onScrub?.(data[idx]);
              }
            }}
          >
            <defs>
              <linearGradient id="moonGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
            {/* Horizon */}
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" label="" />
            {/* Moonrise */}
            {moonrise && (
              <ReferenceLine
                x={moonrise.getTime()}
                stroke="rgba(253,224,71,0.5)"
                strokeDasharray="3 3"
              />
            )}
            {/* Moonset */}
            {moonset && (
              <ReferenceLine
                x={moonset.getTime()}
                stroke="rgba(253,224,71,0.3)"
                strokeDasharray="3 3"
              />
            )}
            {/* Peak */}
            {peak && (
              <ReferenceLine
                x={peak.timestamp}
                stroke="rgba(165,180,252,0.5)"
                strokeDasharray="2 3"
              />
            )}
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={tickData.map((d) => d.timestamp)}
              tickFormatter={(v) => tickFormatter(v, use24h)}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-90, 90]}
              ticks={[-60, -30, 0, 30, 60, 90]}
              tickFormatter={(v) => `${v}°`}
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip use24h={use24h} />} />
            <Area
              type="monotone"
              dataKey="altitudeDeg"
              stroke="#818cf8"
              strokeWidth={2}
              fill="url(#moonGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#a5b4fc", stroke: "#1e1b4b", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Slider scrubber */}
      <div className="px-1">
        <input
          ref={sliderRef}
          type="range"
          min={0}
          max={data.length - 1}
          value={activeIndex ?? 0}
          onChange={handleSliderChange}
          className="w-full accent-indigo-500 cursor-pointer"
          style={{ height: "4px" }}
        />
        {activePoint && (
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-white/50">{formatTime(activePoint.time, use24h)}</span>
            <span className="text-white font-semibold">
              {activePoint.altitudeDeg >= 0 ? "+" : ""}{activePoint.altitudeDeg.toFixed(1)}°
            </span>
            <span className="text-indigo-300">
              {activePoint.cardinal} {activePoint.azimuthDeg.toFixed(0)}°
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
