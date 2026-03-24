"use client";

import React from "react";

interface CompassProps {
  azimuthDeg: number;  // 0=N, 90=E, 180=S, 270=W
  altitudeDeg: number;
  size?: number;
}

export function Compass({ azimuthDeg, altitudeDeg, size = 180 }: CompassProps) {
  const center = size / 2;
  const radius = center - 16;

  // Moon position on the compass ring
  const angleRad = ((azimuthDeg - 90) * Math.PI) / 180;
  const moonX = center + radius * 0.72 * Math.cos(angleRad);
  const moonY = center + radius * 0.72 * Math.sin(angleRad);

  // Needle tip (pointing to azimuth)
  const needleRad = ((azimuthDeg - 90) * Math.PI) / 180;
  const needleTipX = center + (radius - 12) * Math.cos(needleRad);
  const needleTipY = center + (radius - 12) * Math.sin(needleRad);

  const labels = [
    { label: "N", angle: -90 },
    { label: "E", angle: 0 },
    { label: "S", angle: 90 },
    { label: "W", angle: 180 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="select-none"
      aria-label={`Compass showing moon at ${azimuthDeg.toFixed(0)}°`}
    >
      {/* Outer ring */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
      {/* Inner subtle ring */}
      <circle
        cx={center}
        cy={center}
        r={radius * 0.55}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
      />

      {/* Cardinal tick marks */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = ((i * 22.5 - 90) * Math.PI) / 180;
        const isCardinal = i % 4 === 0;
        const inner = isCardinal ? radius - 10 : radius - 6;
        const x1 = center + radius * Math.cos(a);
        const y1 = center + radius * Math.sin(a);
        const x2 = center + inner * Math.cos(a);
        const y2 = center + inner * Math.sin(a);
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={isCardinal ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)"}
            strokeWidth={isCardinal ? 1.5 : 1}
          />
        );
      })}

      {/* Cardinal labels */}
      {labels.map(({ label, angle }) => {
        const a = (angle * Math.PI) / 180;
        const lx = center + (radius + 11) * Math.cos(a);
        const ly = center + (radius + 11) * Math.sin(a);
        return (
          <text
            key={label}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={label === "N" ? 11 : 10}
            fontWeight={label === "N" ? "700" : "500"}
            fill={label === "N" ? "rgba(251,191,36,0.9)" : "rgba(255,255,255,0.4)"}
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      {/* Direction line from center to moon */}
      <line
        x1={center}
        y1={center}
        x2={needleTipX}
        y2={needleTipY}
        stroke="rgba(165,180,252,0.5)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />

      {/* Center dot */}
      <circle cx={center} cy={center} r={3} fill="rgba(165,180,252,0.6)" />

      {/* Moon glyph */}
      <circle
        cx={moonX}
        cy={moonY}
        r={11}
        fill={altitudeDeg > 0 ? "rgba(253,224,71,0.2)" : "rgba(255,255,255,0.06)"}
        stroke={altitudeDeg > 0 ? "rgba(253,224,71,0.7)" : "rgba(255,255,255,0.2)"}
        strokeWidth="1.5"
      />
      <text
        x={moonX}
        y={moonY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
      >
        {altitudeDeg > 0 ? "🌕" : "🌑"}
      </text>
    </svg>
  );
}
