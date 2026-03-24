"use client";

import React from "react";

interface CompassProps {
  azimuthDeg: number;
  altitudeDeg: number;
  size?: number;
  nightMode?: boolean;
}

export function Compass({ azimuthDeg, altitudeDeg, size = 180, nightMode = false }: CompassProps) {
  const center = size / 2;
  const radius = center - 16;

  // Colors
  const ring      = nightMode ? "rgba(200,0,0,0.2)"   : "rgba(255,255,255,0.12)";
  const ringInner = nightMode ? "rgba(200,0,0,0.08)"  : "rgba(255,255,255,0.06)";
  const tickMaj   = nightMode ? "rgba(200,0,0,0.45)"  : "rgba(255,255,255,0.4)";
  const tickMin   = nightMode ? "rgba(200,0,0,0.18)"  : "rgba(255,255,255,0.15)";
  const labelN    = nightMode ? "rgba(255,80,0,0.95)"  : "rgba(251,191,36,0.9)";
  const labelCard = nightMode ? "rgba(200,40,0,0.55)"  : "rgba(255,255,255,0.4)";
  const needle    = nightMode ? "rgba(180,40,0,0.55)"  : "rgba(165,180,252,0.5)";
  const centerDot = nightMode ? "rgba(200,50,0,0.65)"  : "rgba(165,180,252,0.6)";

  const moonVisible = altitudeDeg > 0;
  const moonFill    = nightMode
    ? (moonVisible ? "rgba(200,40,0,0.18)"  : "rgba(100,0,0,0.08)")
    : (moonVisible ? "rgba(253,224,71,0.2)" : "rgba(255,255,255,0.06)");
  const moonStroke  = nightMode
    ? (moonVisible ? "rgba(255,70,0,0.75)"  : "rgba(150,0,0,0.25)")
    : (moonVisible ? "rgba(253,224,71,0.7)" : "rgba(255,255,255,0.2)");

  const angleRad  = ((azimuthDeg - 90) * Math.PI) / 180;
  const moonX     = center + radius * 0.72 * Math.cos(angleRad);
  const moonY     = center + radius * 0.72 * Math.sin(angleRad);
  const needleTipX = center + (radius - 12) * Math.cos(angleRad);
  const needleTipY = center + (radius - 12) * Math.sin(angleRad);

  const cardinals = [
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
      <circle cx={center} cy={center} r={radius} fill="none" stroke={ring} strokeWidth="1.5" />
      <circle cx={center} cy={center} r={radius * 0.55} fill="none" stroke={ringInner} strokeWidth="1" />

      {Array.from({ length: 16 }).map((_, i) => {
        const a = ((i * 22.5 - 90) * Math.PI) / 180;
        const isCardinal = i % 4 === 0;
        const inner = isCardinal ? radius - 10 : radius - 6;
        return (
          <line
            key={i}
            x1={center + radius * Math.cos(a)} y1={center + radius * Math.sin(a)}
            x2={center + inner * Math.cos(a)}  y2={center + inner * Math.sin(a)}
            stroke={isCardinal ? tickMaj : tickMin}
            strokeWidth={isCardinal ? 1.5 : 1}
          />
        );
      })}

      {cardinals.map(({ label, angle }) => {
        const a = (angle * Math.PI) / 180;
        return (
          <text
            key={label}
            x={center + (radius + 11) * Math.cos(a)}
            y={center + (radius + 11) * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={label === "N" ? 11 : 10}
            fontWeight={label === "N" ? "700" : "500"}
            fill={label === "N" ? labelN : labelCard}
            fontFamily="system-ui, sans-serif"
          >
            {label}
          </text>
        );
      })}

      <line x1={center} y1={center} x2={needleTipX} y2={needleTipY}
        stroke={needle} strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx={center} cy={center} r={3} fill={centerDot} />

      <circle cx={moonX} cy={moonY} r={11} fill={moonFill} stroke={moonStroke} strokeWidth="1.5" />
      <text x={moonX} y={moonY} textAnchor="middle" dominantBaseline="central" fontSize={13}>
        {moonVisible ? "🌕" : "🌑"}
      </text>
    </svg>
  );
}
