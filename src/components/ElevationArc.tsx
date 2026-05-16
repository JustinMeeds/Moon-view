"use client";

import React from "react";

interface ElevationArcProps {
  moonAltitudeDeg: number;
  tiltDeg: number | null;
  nightMode?: boolean;
}

export function ElevationArc({ moonAltitudeDeg, tiltDeg, nightMode = false }: ElevationArcProps) {
  const svgW = 100;
  const svgH = 30;
  const barY = 11;
  const leftX = 8;
  const rightX = 92;
  const barW = rightX - leftX;

  const toX = (deg: number) => leftX + (Math.max(0, Math.min(90, deg)) / 90) * barW;

  const moonX = toX(moonAltitudeDeg);
  // Show phone indicator at 0° minimum (left end) even when tilt is negative
  const phoneX = tiltDeg != null ? toX(Math.max(0, tiltDeg)) : null;
  const phoneBelowHorizon = tiltDeg != null && tiltDeg < 0;

  const moonVisible = moonAltitudeDeg > 0;
  const isAligned = tiltDeg != null && moonVisible && Math.abs(tiltDeg - moonAltitudeDeg) < 5;

  const barColor   = nightMode ? "rgba(200,0,0,0.18)"  : "rgba(255,255,255,0.12)";
  const tickColor  = nightMode ? "rgba(200,0,0,0.28)"  : "rgba(255,255,255,0.18)";
  const labelColor = nightMode ? "rgba(200,0,0,0.35)"  : "rgba(255,255,255,0.22)";
  const moonColor  = moonVisible
    ? (nightMode ? "rgba(255,60,0,0.9)"  : "rgba(253,224,71,0.95)")
    : (nightMode ? "rgba(100,0,0,0.3)"   : "rgba(255,255,255,0.18)");
  const phoneColor = isAligned
    ? moonColor
    : (phoneBelowHorizon
      ? (nightMode ? "rgba(200,0,0,0.3)" : "rgba(165,180,252,0.3)")
      : (nightMode ? "rgba(255,80,0,0.8)" : "rgba(165,180,252,0.85)"));

  return (
    <div>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
        {/* Horizontal scale bar */}
        <line x1={leftX} y1={barY} x2={rightX} y2={barY} stroke={barColor} strokeWidth={1.5} />

        {/* End caps */}
        <line x1={leftX}  y1={barY - 4} x2={leftX}  y2={barY + 4} stroke={tickColor} strokeWidth={1.5} />
        <line x1={rightX} y1={barY - 4} x2={rightX} y2={barY + 4} stroke={tickColor} strokeWidth={1.5} />

        {/* 30° and 60° tick marks */}
        {[30, 60].map(d => (
          <line key={d} x1={toX(d)} y1={barY - 2} x2={toX(d)} y2={barY + 2} stroke={tickColor} strokeWidth={1} />
        ))}

        {/* Labels */}
        <text x={leftX}  y={svgH - 1} textAnchor="middle" fontSize={7} fill={labelColor} fontFamily="system-ui, sans-serif">0°</text>
        <text x={rightX} y={svgH - 1} textAnchor="middle" fontSize={7} fill={labelColor} fontFamily="system-ui, sans-serif">90°</text>

        {/* Moon target — circle above bar */}
        {isAligned && (
          <circle cx={moonX} cy={barY} r={8} fill={moonColor} opacity={0.18} />
        )}
        <circle cx={moonX} cy={barY} r={moonVisible ? 4 : 2.5} fill={moonColor} />

        {/* Phone tilt indicator — upward-pointing triangle below bar */}
        {phoneX != null && (
          <polygon
            points={`${phoneX - 4.5},${barY + 10} ${phoneX + 4.5},${barY + 10} ${phoneX},${barY + 3}`}
            fill={phoneColor}
          />
        )}
      </svg>

      {tiltDeg != null && (
        <p className={`text-[8px] leading-none ${
          isAligned
            ? (nightMode ? "text-orange-300 font-medium" : "text-indigo-300 font-medium")
            : "text-white/25"
        }`}>
          {isAligned
            ? "✓ on target"
            : moonVisible
              ? "tilt phone to aim"
              : "moon below horizon"}
        </p>
      )}
    </div>
  );
}
