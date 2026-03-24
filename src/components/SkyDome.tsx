"use client";

import React from "react";
import { ChartPoint } from "@/lib/moon";
import { formatTime } from "@/lib/utils";

interface SkyDomeProps {
  /** 15-min chart points for the night */
  data: ChartPoint[];
  /** Current or scrubbed time to highlight */
  highlightTime?: Date | null;
  moonrise: Date | null;
  moonset: Date | null;
  peak: ChartPoint | null;
  use24h: boolean;
  nightMode?: boolean;
  size?: number;
}

function polarToXY(altDeg: number, azDeg: number, cx: number, cy: number, maxR: number) {
  // r=0 at zenith (alt=90), r=maxR at horizon (alt=0)
  const r = ((90 - Math.max(altDeg, 0)) / 90) * maxR;
  const angleDeg = azDeg - 90; // rotate so N is at top
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function SkyDome({
  data,
  highlightTime,
  moonrise,
  moonset,
  peak,
  use24h,
  nightMode = false,
  size = 260,
}: SkyDomeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 28; // leave room for labels

  // Night mode colors
  const ringColor    = nightMode ? "rgba(200,0,0,0.18)"  : "rgba(255,255,255,0.1)";
  const labelColor   = nightMode ? "rgba(200,40,0,0.5)"  : "rgba(255,255,255,0.3)";
  const altLabelC    = nightMode ? "rgba(200,30,0,0.35)" : "rgba(255,255,255,0.2)";
  const pathColor    = nightMode ? "#cc2000"             : "#818cf8";
  const pathFill     = nightMode ? "rgba(180,0,0,0.08)"  : "rgba(129,140,248,0.07)";
  const riseSetColor = nightMode ? "rgba(220,50,0,0.8)"  : "rgba(253,224,71,0.85)";
  const peakColor    = nightMode ? "rgba(220,60,0,0.9)"  : "rgba(165,180,252,0.9)";
  const nowColor     = nightMode ? "#ff3300"             : "#a5b4fc";
  const nowRing      = nightMode ? "rgba(200,40,0,0.4)"  : "rgba(165,180,252,0.4)";
  const cardinalN    = nightMode ? "rgba(255,80,0,0.9)"  : "rgba(251,191,36,0.85)";
  const cardinalOth  = nightMode ? "rgba(200,40,0,0.5)"  : "rgba(255,255,255,0.35)";

  // Only draw above-horizon points
  const abovePoints = data.filter((p) => p.altitudeDeg >= 0);
  if (abovePoints.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl border border-white/10"
        style={{ width: size, height: size, margin: "0 auto" }}
      >
        <p className="text-xs text-white/40">Moon below horizon all night</p>
      </div>
    );
  }

  // Build SVG path for moon arc
  const pathParts = abovePoints.map((p, i) => {
    const { x, y } = polarToXY(p.altitudeDeg, p.azimuthDeg, cx, cy, maxR);
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const moonPath = pathParts.join(" ");

  // Close path to horizon for fill
  const firstP = polarToXY(0, abovePoints[0].azimuthDeg, cx, cy, maxR);
  const lastP  = polarToXY(0, abovePoints[abovePoints.length - 1].azimuthDeg, cx, cy, maxR);
  const fillPath = `${moonPath} L${lastP.x.toFixed(1)},${lastP.y.toFixed(1)} L${firstP.x.toFixed(1)},${firstP.y.toFixed(1)} Z`;

  // Key points
  const riseXY = moonrise ? polarToXY(0, abovePoints[0].azimuthDeg, cx, cy, maxR) : null;
  const setXY  = moonset  ? polarToXY(0, abovePoints[abovePoints.length - 1].azimuthDeg, cx, cy, maxR) : null;
  const peakXY = peak     ? polarToXY(peak.altitudeDeg, peak.azimuthDeg, cx, cy, maxR) : null;

  // Highlighted/current position
  let highlightXY: { x: number; y: number } | null = null;
  if (highlightTime) {
    const ht = highlightTime.getTime();
    const closest = abovePoints.reduce<ChartPoint | null>((best, p) => {
      if (!best) return p;
      return Math.abs(p.timestamp - ht) < Math.abs(best.timestamp - ht) ? p : best;
    }, null);
    if (closest && closest.altitudeDeg >= 0) {
      highlightXY = polarToXY(closest.altitudeDeg, closest.azimuthDeg, cx, cy, maxR);
    }
  }

  // Altitude rings at 30° and 60°
  const ring30 = ((90 - 30) / 90) * maxR;
  const ring60 = ((90 - 60) / 90) * maxR;

  const cardinals = [
    { label: "N", az: 0 },
    { label: "E", az: 90 },
    { label: "S", az: 180 },
    { label: "W", az: 270 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="select-none mx-auto block"
      aria-label="Sky dome showing moon path tonight"
    >
      {/* Horizon circle */}
      <circle cx={cx} cy={cy} r={maxR} fill="none" stroke={ringColor} strokeWidth="1.5" />
      {/* 60° altitude ring */}
      <circle cx={cx} cy={cy} r={ring60} fill="none" stroke={ringColor} strokeWidth="1" strokeDasharray="3 4" />
      {/* 30° altitude ring */}
      <circle cx={cx} cy={cy} r={ring30} fill="none" stroke={ringColor} strokeWidth="1" strokeDasharray="3 4" />
      {/* Zenith dot */}
      <circle cx={cx} cy={cy} r={2} fill={ringColor} />

      {/* Altitude ring labels */}
      <text x={cx + 4} y={cy - ring60 - 4} fontSize={8} fill={altLabelC} fontFamily="system-ui">60°</text>
      <text x={cx + 4} y={cy - ring30 - 4} fontSize={8} fill={altLabelC} fontFamily="system-ui">30°</text>

      {/* Cardinal direction cross-hairs */}
      {cardinals.map(({ label, az }) => {
        const { x, y } = polarToXY(0, az, cx, cy, maxR);
        const tickIn = polarToXY(0, az, cx, cy, maxR - 8);
        const lx = cx + (maxR + 14) * Math.cos(((az - 90) * Math.PI) / 180);
        const ly = cy + (maxR + 14) * Math.sin(((az - 90) * Math.PI) / 180);
        return (
          <g key={label}>
            <line x1={tickIn.x} y1={tickIn.y} x2={x} y2={y} stroke={ringColor} strokeWidth="1.5" />
            <text
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={label === "N" ? 11 : 10}
              fontWeight={label === "N" ? "700" : "500"}
              fill={label === "N" ? cardinalN : cardinalOth}
              fontFamily="system-ui"
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Moon path fill */}
      <path d={fillPath} fill={pathFill} />
      {/* Moon path stroke */}
      <path d={moonPath} fill="none" stroke={pathColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Moonrise marker */}
      {riseXY && moonrise && (
        <g>
          <circle cx={riseXY.x} cy={riseXY.y} r={4} fill={riseSetColor} />
          <text
            x={riseXY.x + (riseXY.x < cx ? -7 : 7)}
            y={riseXY.y - 8}
            textAnchor={riseXY.x < cx ? "end" : "start"}
            fontSize={8} fill={riseSetColor} fontFamily="system-ui"
          >
            {formatTime(moonrise, use24h)}
          </text>
        </g>
      )}

      {/* Moonset marker */}
      {setXY && moonset && (
        <g>
          <circle cx={setXY.x} cy={setXY.y} r={4} fill={riseSetColor} />
          <text
            x={setXY.x + (setXY.x < cx ? -7 : 7)}
            y={setXY.y - 8}
            textAnchor={setXY.x < cx ? "end" : "start"}
            fontSize={8} fill={riseSetColor} fontFamily="system-ui"
          >
            {formatTime(moonset, use24h)}
          </text>
        </g>
      )}

      {/* Peak marker */}
      {peakXY && peak && (
        <g>
          <circle cx={peakXY.x} cy={peakXY.y} r={5} fill="none" stroke={peakColor} strokeWidth="1.5" />
          <text
            x={peakXY.x}
            y={peakXY.y - 10}
            textAnchor="middle"
            fontSize={8} fill={peakColor} fontFamily="system-ui"
          >
            Peak {peak.altitudeDeg.toFixed(0)}°
          </text>
        </g>
      )}

      {/* Current / highlight position */}
      {highlightXY && (
        <g>
          <circle cx={highlightXY.x} cy={highlightXY.y} r={8} fill="none" stroke={nowRing} strokeWidth="1.5" />
          <circle cx={highlightXY.x} cy={highlightXY.y} r={4} fill={nowColor} />
        </g>
      )}
    </svg>
  );
}
