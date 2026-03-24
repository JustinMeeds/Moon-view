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
  nightMode?: boolean;
  onScrub?: (point: ChartPoint) => void;
}

function CustomTooltip({
  active,
  payload,
  use24h,
  nightMode,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  use24h: boolean;
  nightMode: boolean;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-xl border"
      style={{
        background: nightMode ? "#0a0000" : "#0f172a",
        borderColor: nightMode ? "rgba(180,0,0,0.35)" : "rgba(255,255,255,0.1)",
        color: nightMode ? "#ff3300" : "#f8fafc",
      }}
    >
      <div style={{ color: nightMode ? "rgba(200,40,0,0.6)" : "rgba(255,255,255,0.5)" }} className="mb-1">
        {formatTime(p.time, use24h)}
      </div>
      <div className="font-semibold">
        {p.altitudeDeg >= 0 ? "+" : ""}{p.altitudeDeg.toFixed(1)}°
      </div>
      <div style={{ color: nightMode ? "#cc2000" : "#a5b4fc" }}>
        {p.cardinal} {p.azimuthDeg.toFixed(0)}°
      </div>
    </div>
  );
}

export function MoonChart({ data, moonrise, moonset, peak, use24h, nightMode = false, onScrub }: MoonChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  const stroke     = nightMode ? "#cc2000" : "#818cf8";
  const gradStart  = nightMode ? "rgba(180,0,0,0.38)" : "rgba(129,140,248,0.4)";
  const gradId     = nightMode ? "moonGradNight" : "moonGrad";
  const gridColor  = nightMode ? "rgba(150,0,0,0.09)" : "rgba(255,255,255,0.06)";
  const horizColor = nightMode ? "rgba(200,40,0,0.35)" : "rgba(255,255,255,0.25)";
  const riseColor  = nightMode ? "rgba(180,30,0,0.55)" : "rgba(253,224,71,0.5)";
  const setColor   = nightMode ? "rgba(180,30,0,0.35)" : "rgba(253,224,71,0.3)";
  const peakColor  = nightMode ? "rgba(180,40,0,0.55)" : "rgba(165,180,252,0.5)";
  const tickColor  = nightMode ? "rgba(200,40,0,0.4)"  : "rgba(255,255,255,0.25)";
  const dotFill    = nightMode ? "#ff3300" : "#a5b4fc";
  const dotBorder  = nightMode ? "#200000" : "#1e1b4b";

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
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={gradStart} stopOpacity={1} />
                <stop offset="95%" stopColor={gradStart} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
            <ReferenceLine y={0} stroke={horizColor} strokeDasharray="4 4" />
            {moonrise && <ReferenceLine x={moonrise.getTime()} stroke={riseColor} strokeDasharray="3 3" />}
            {moonset  && <ReferenceLine x={moonset.getTime()}  stroke={setColor}  strokeDasharray="3 3" />}
            {peak     && <ReferenceLine x={peak.timestamp}     stroke={peakColor} strokeDasharray="2 3" />}

            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              ticks={tickData.map((d) => d.timestamp)}
              tickFormatter={(v) => formatTime(new Date(v), use24h)}
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[-90, 90]}
              ticks={[-60, -30, 0, 30, 60, 90]}
              tickFormatter={(v) => `${v}°`}
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip use24h={use24h} nightMode={nightMode} />} />
            <Area
              type="monotone"
              dataKey="altitudeDeg"
              stroke={stroke}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: dotFill, stroke: dotBorder, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Slider scrubber */}
      <div className="px-1">
        {activeIndex === null && (
          <p className="text-center text-[10px] text-white/25 mb-1 tracking-wide">Drag to explore</p>
        )}
        <input
          ref={sliderRef}
          type="range"
          min={0}
          max={data.length - 1}
          value={activeIndex ?? 0}
          onChange={handleSliderChange}
          className="w-full cursor-pointer"
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
