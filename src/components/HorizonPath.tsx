"use client";

import React, { useMemo, useRef, useState, useCallback } from "react";
import { ChartPoint } from "@/lib/moon";
import { SkyBody } from "@/lib/planets";
import { formatTime, azimuthToCardinal } from "@/lib/utils";

interface HorizonPathProps {
  /** 15-min chart points for the full day */
  data: ChartPoint[];
  /** Current or scrubbed time to highlight */
  highlightTime?: Date | null;
  moonrise: Date | null;
  moonset: Date | null;
  /** Exact azimuth of moonrise/moonset (from getMoonPosition at the event time) */
  riseAzimuthDeg?: number | null;
  setAzimuthDeg?: number | null;
  peak: ChartPoint | null;
  use24h: boolean;
  useCardinal?: boolean;
  nightMode?: boolean;
  headingDeg?: number | null; // live device heading; when provided, view follows compass
  /** Planets/sun to overlay, positioned at the same instant as highlightTime */
  bodies?: SkyBody[];
  /** Override the automatic rise/peak framing (e.g. center on an event bearing) */
  defaultCenterDeg?: number;
}

/** Angular separation between two alt/az directions, in degrees */
function angularSep(alt1: number, az1: number, alt2: number, az2: number): number {
  const r = Math.PI / 180;
  const s =
    Math.sin(alt1 * r) * Math.sin(alt2 * r) +
    Math.cos(alt1 * r) * Math.cos(alt2 * r) * Math.cos((az1 - az2) * r);
  return Math.acos(Math.max(-1, Math.min(1, s))) / r;
}

/** Dot radius from apparent magnitude — brighter body, bigger dot */
function magToRadius(mag: number): number {
  if (mag <= -4) return 4;    // Venus
  if (mag <= -2) return 3.4;  // Jupiter
  if (mag <= 0) return 2.8;
  if (mag <= 1.5) return 2.3;
  return 1.8;
}

/** Signed shortest angular difference a→b in (−180, 180] */
function wrap180(deg: number): number {
  return ((deg % 360) + 540) % 360 - 180;
}

// ViewBox geometry
const W = 360;
const H = 252;
const TOP_PAD = 16;
const HORIZON_Y = 178;
const BELOW_CLIP = 24; // px of below-horizon path shown
const FOV = 120; // degrees of azimuth visible
const PX_PER_AZ = W / FOV;

export function HorizonPath({
  data,
  highlightTime,
  moonrise,
  moonset,
  riseAzimuthDeg,
  setAzimuthDeg,
  peak,
  use24h,
  useCardinal = true,
  nightMode = false,
  headingDeg,
  bodies,
  defaultCenterDeg,
}: HorizonPathProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ startX: number; startCenter: number } | null>(null);
  // Manual pan override; null = follow compass (if live) or default framing
  const [panCenter, setPanCenter] = useState<number | null>(null);

  const liveHeading = headingDeg != null;

  // Night mode colors — same palette as SkyDome
  const lineColor    = nightMode ? "rgba(200,0,0,0.18)"  : "rgba(255,255,255,0.1)";
  const tapeLabel    = nightMode ? "rgba(200,40,0,0.5)"  : "rgba(255,255,255,0.35)";
  const altLabelC    = nightMode ? "rgba(200,30,0,0.35)" : "rgba(255,255,255,0.2)";
  const pathColor    = nightMode ? "#cc2000"             : "#818cf8";
  const pathFill     = nightMode ? "rgba(180,0,0,0.08)"  : "rgba(129,140,248,0.07)";
  const riseSetColor = nightMode ? "rgba(220,50,0,0.8)"  : "rgba(253,224,71,0.85)";
  const peakColor    = nightMode ? "rgba(220,60,0,0.9)"  : "rgba(165,180,252,0.9)";
  const nowColor     = nightMode ? "#ff3300"             : "#a5b4fc";
  const nowRing      = nightMode ? "rgba(200,40,0,0.4)"  : "rgba(165,180,252,0.4)";
  const cardinalN    = nightMode ? "rgba(255,80,0,0.9)"  : "rgba(251,191,36,0.85)";
  const facingColor  = nightMode ? "rgba(220,50,0,0.45)" : "rgba(255,255,255,0.3)";

  // Vertical scale: fit the peak with headroom, min 60° range
  const maxAlt = Math.min(90, Math.max(60, (peak?.altitudeDeg ?? 0) + 10));
  const pxPerAlt = (HORIZON_Y - TOP_PAD) / maxAlt;
  const altToY = (alt: number) => HORIZON_Y - alt * pxPerAlt;

  // Default framing: frame both the moonrise spot and the peak when possible,
  // else center whichever exists
  const defaultCenter = useMemo(() => {
    if (defaultCenterDeg != null) return defaultCenterDeg;
    if (riseAzimuthDeg != null && peak) {
      const mid = riseAzimuthDeg + wrap180(peak.azimuthDeg - riseAzimuthDeg) / 2;
      return ((mid % 360) + 360) % 360;
    }
    if (riseAzimuthDeg != null) return riseAzimuthDeg;
    if (peak) return peak.azimuthDeg;
    return data.length > 0 ? data[0].azimuthDeg : 180;
  }, [defaultCenterDeg, riseAzimuthDeg, peak, data]);

  const viewCenter =
    panCenter ?? (liveHeading ? headingDeg! : defaultCenter);

  const azToX = useCallback(
    (az: number) => W / 2 + wrap180(az - viewCenter) * PX_PER_AZ,
    [viewCenter]
  );

  // Build path segments, split on azimuth wraparound and horizon crossings
  const { solidSegs, dashedSegs } = useMemo(() => {
    const solid: string[] = [];
    const dashed: string[] = [];
    let cur: { x: number; y: number }[] = [];
    let curAbove: boolean | null = null;
    let prevRel: number | null = null;

    const flush = () => {
      if (cur.length >= 2) {
        const d = cur.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        (curAbove ? solid : dashed).push(d);
      }
      cur = [];
    };

    for (let i = 0; i < data.length; i++) {
      const p = data[i];
      const rel = wrap180(p.azimuthDeg - viewCenter);
      const x = W / 2 + rel * PX_PER_AZ;
      const y = altToY(p.altitudeDeg);
      const above = p.altitudeDeg >= 0;

      const prev = data[i - 1];
      // Split when the path crosses the anti-center meridian — consecutive points
      // land on opposite far edges in view space and would draw a chord across the view
      const relJump = prevRel != null && Math.abs(rel - prevRel) > 180;
      prevRel = rel;

      if (relJump) {
        flush();
        curAbove = above;
      } else if (curAbove !== null && above !== curAbove && prev) {
        // Horizon crossing — interpolate the exact crossing point
        const a0 = prev.altitudeDeg;
        const a1 = p.altitudeDeg;
        const t = a0 / (a0 - a1);
        const cx = W / 2 + wrap180(prev.azimuthDeg + wrap180(p.azimuthDeg - prev.azimuthDeg) * t - viewCenter) * PX_PER_AZ;
        cur.push({ x: cx, y: HORIZON_Y });
        flush();
        cur.push({ x: cx, y: HORIZON_Y });
        curAbove = above;
      } else if (curAbove === null) {
        curAbove = above;
      }

      cur.push({ x, y });
    }
    flush();
    return { solidSegs: solid, dashedSegs: dashed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, viewCenter, pxPerAlt]);

  // Highlighted/current position (nearest chart point)
  const highlightPoint = useMemo(() => {
    if (!highlightTime || data.length === 0) return null;
    const ht = highlightTime.getTime();
    return data.reduce((best, p) =>
      Math.abs(p.timestamp - ht) < Math.abs(best.timestamp - ht) ? p : best
    );
  }, [highlightTime, data]);

  // Compass tape: minor ticks every 5°, cardinal labels every 22.5°
  const tape = useMemo(() => {
    const ticks: { x: number; az: number; major: boolean; label?: string }[] = [];
    const start = Math.ceil((viewCenter - FOV / 2) / 5) * 5;
    for (let az = start; az <= viewCenter + FOV / 2; az += 5) {
      const norm = ((az % 360) + 360) % 360;
      const major = norm % 22.5 === 0;
      ticks.push({
        x: azToX(norm),
        az: norm,
        major,
        label: major
          ? useCardinal ? azimuthToCardinal(norm) : `${Math.round(norm)}°`
          : undefined,
      });
    }
    return ticks;
  }, [viewCenter, azToX, useCardinal]);

  // Turn hint: guide toward the moon at the displayed instant, or the moonrise spot
  const hint = useMemo(() => {
    if (!liveHeading) return null;
    let targetAz: number | null = null;
    let targetLabel = "";
    if (highlightPoint?.isVisible) {
      targetAz = highlightPoint.azimuthDeg;
      targetLabel = "moon";
    } else if (riseAzimuthDeg != null) {
      targetAz = riseAzimuthDeg;
      targetLabel = "moonrise";
    }
    if (targetAz == null) return null;
    const delta = wrap180(targetAz - headingDeg!);
    if (Math.abs(delta) <= 8) return { text: `${targetLabel} ahead`, delta: 0 };
    const dir = delta > 0 ? "→" : "←";
    const turn = `turn ${dir === "←" ? "left" : "right"} ${Math.abs(Math.round(delta))}°`;
    return { text: `${dir === "←" ? "← " : ""}${turn} to ${targetLabel}${dir === "→" ? " →" : ""}`, delta };
  }, [liveHeading, headingDeg, highlightPoint, riseAzimuthDeg]);

  // Drag to pan
  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { startX: e.clientX, startCenter: viewCenter };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [viewCenter]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current || !svgRef.current) return;
    const scale = W / svgRef.current.getBoundingClientRect().width;
    const dAz = -(e.clientX - dragRef.current.startX) * scale / PX_PER_AZ;
    setPanCenter((((dragRef.current.startCenter + dAz) % 360) + 360) % 360);
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const formatBearing = (az: number) =>
    useCardinal ? `${Math.round(az)}° ${azimuthToCardinal(az)}` : `${Math.round(az)}°`;

  const riseX = riseAzimuthDeg != null ? azToX(riseAzimuthDeg) : null;
  const setX  = setAzimuthDeg  != null ? azToX(setAzimuthDeg)  : null;
  const inView = (x: number | null): x is number => x != null && x > -20 && x < W + 20;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="select-none w-full block touch-none cursor-grab active:cursor-grabbing"
        aria-label="Horizon view showing where the moon rises, travels, and sets from your perspective"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <clipPath id="horizon-clip">
            <rect x={0} y={0} width={W} height={HORIZON_Y + BELOW_CLIP} />
          </clipPath>
        </defs>

        {/* Altitude guides at 30° / 60° */}
        {[30, 60].map((alt) =>
          alt <= maxAlt ? (
            <g key={alt}>
              <line x1={0} y1={altToY(alt)} x2={W} y2={altToY(alt)} stroke={lineColor} strokeWidth={1} strokeDasharray="3 5" />
              <text x={4} y={altToY(alt) - 3} fontSize={8} fill={altLabelC} fontFamily="system-ui">{alt}°</text>
            </g>
          ) : null
        )}

        <g clipPath="url(#horizon-clip)">
          {/* Fill under above-horizon arcs */}
          {solidSegs.map((d, i) => {
            const nums = d.match(/-?[\d.]+/g);
            if (!nums || nums.length < 4) return null;
            const x0 = nums[0], xn = nums[nums.length - 2];
            return <path key={`f${i}`} d={`${d} L${xn},${HORIZON_Y} L${x0},${HORIZON_Y} Z`} fill={pathFill} />;
          })}
          {/* Below-horizon path (dashed) */}
          {dashedSegs.map((d, i) => (
            <path key={`d${i}`} d={d} fill="none" stroke={pathColor} strokeWidth={2} strokeDasharray="3 5" opacity={0.45} strokeLinecap="round" />
          ))}
          {/* Above-horizon path (solid) */}
          {solidSegs.map((d, i) => (
            <path key={`s${i}`} d={d} fill="none" stroke={pathColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>

        {/* Horizon line */}
        <line x1={0} y1={HORIZON_Y} x2={W} y2={HORIZON_Y} stroke={lineColor} strokeWidth={1.5} />

        {/* Moonrise marker — the exact spot on the horizon */}
        {inView(riseX) && moonrise && (
          <g>
            <line x1={riseX} y1={HORIZON_Y - 10} x2={riseX} y2={HORIZON_Y + 10} stroke={riseSetColor} strokeWidth={2} />
            <circle cx={riseX} cy={HORIZON_Y} r={4} fill={riseSetColor} />
            <text x={riseX} y={HORIZON_Y - 16} textAnchor="middle" fontSize={9} fontWeight={600} fill={riseSetColor} fontFamily="system-ui">
              ↑ {formatTime(moonrise, use24h)} · {formatBearing(riseAzimuthDeg!)}
            </text>
          </g>
        )}

        {/* Moonset marker */}
        {inView(setX) && moonset && (
          <g>
            <line x1={setX} y1={HORIZON_Y - 10} x2={setX} y2={HORIZON_Y + 10} stroke={riseSetColor} strokeWidth={2} opacity={0.7} />
            <circle cx={setX} cy={HORIZON_Y} r={4} fill={riseSetColor} opacity={0.7} />
            <text x={setX} y={HORIZON_Y + 20} textAnchor="middle" fontSize={9} fill={riseSetColor} opacity={0.85} fontFamily="system-ui">
              ↓ {formatTime(moonset, use24h)} · {formatBearing(setAzimuthDeg!)}
            </text>
          </g>
        )}

        {/* Peak marker */}
        {peak && (() => {
          const px = azToX(peak.azimuthDeg);
          if (!inView(px)) return null;
          const py = altToY(peak.altitudeDeg);
          return (
            <g>
              <circle cx={px} cy={py} r={4.5} fill="none" stroke={peakColor} strokeWidth={1.5} />
              <text x={px} y={py - 9} textAnchor="middle" fontSize={8} fill={peakColor} fontFamily="system-ui">
                Peak {peak.altitudeDeg.toFixed(0)}° · {formatTime(peak.time, use24h)}
              </text>
            </g>
          );
        })()}

        {/* Current / highlighted moon */}
        {highlightPoint && (() => {
          const hx = azToX(highlightPoint.azimuthDeg);
          if (!inView(hx)) return null;
          const hy = Math.min(altToY(highlightPoint.altitudeDeg), HORIZON_Y + BELOW_CLIP - 4);
          const dim = highlightPoint.altitudeDeg < 0;
          return (
            <g opacity={dim ? 0.45 : 1}>
              <circle cx={hx} cy={hy} r={9} fill="none" stroke={nowRing} strokeWidth={1.5} />
              <circle cx={hx} cy={hy} r={5} fill={nowColor} />
            </g>
          );
        })()}

        {/* Planet / sun overlay at the displayed instant */}
        {bodies?.map((b, bi) => {
          const isSun = b.name === "Sun";
          if (b.altitudeDeg < (isSun ? -12 : -8)) return null;
          const bx = azToX(b.azimuthDeg);
          if (!inView(bx)) return null;
          const by = Math.min(altToY(b.altitudeDeg), HORIZON_Y + BELOW_CLIP - 4);
          const color = nightMode ? "#e04a00" : b.colorHex;
          const dim = b.altitudeDeg < 0;
          const r = isSun ? 7 : magToRadius(b.magnitude);
          // Stagger label vertical offset by index to reduce pile-ups in clusters
          const labelDy = bi % 2 === 0 ? 3 : 13;
          return (
            <g key={b.name} opacity={dim ? 0.35 : isSun ? 0.9 : 1}>
              <circle cx={bx} cy={by} r={r} fill={color} />
              {isSun && <circle cx={bx} cy={by} r={r + 3.5} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />}
              {!dim && (
                <text x={bx + r + 4} y={by + labelDy} fontSize={8.5} fill={color} fontFamily="system-ui">
                  {b.symbol} {b.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Emergent conjunction ring: moon within 5° of a planet at this instant */}
        {highlightPoint && highlightPoint.altitudeDeg > -5 && bodies?.map((b) => {
          if (b.name === "Sun" || b.altitudeDeg < -5) return null;
          const sep = angularSep(highlightPoint.altitudeDeg, highlightPoint.azimuthDeg, b.altitudeDeg, b.azimuthDeg);
          if (sep >= 5) return null;
          const mx = azToX(highlightPoint.azimuthDeg);
          const bx = azToX(b.azimuthDeg);
          if (!inView(mx) && !inView(bx)) return null;
          const my = altToY(highlightPoint.altitudeDeg);
          const by = altToY(b.altitudeDeg);
          const cx = (mx + bx) / 2;
          const cy = (my + by) / 2;
          const rr = Math.max(Math.hypot(mx - bx, my - by) / 2 + 13, 20);
          return (
            <g key={`conj-${b.name}`}>
              <circle cx={cx} cy={cy} r={rr} fill="none" stroke={riseSetColor} strokeWidth={1} strokeDasharray="3 4" opacity={0.8} />
              <text x={cx} y={cy - rr - 5} textAnchor="middle" fontSize={9} fontWeight={600} fill={riseSetColor} fontFamily="system-ui">
                {b.symbol} {sep.toFixed(1)}° apart
              </text>
            </g>
          );
        })}

        {/* Compass tape */}
        {tape.map((t) => (
          <g key={t.az}>
            <line x1={t.x} y1={HORIZON_Y + 26} x2={t.x} y2={HORIZON_Y + (t.major ? 34 : 30)} stroke={lineColor} strokeWidth={t.major ? 1.5 : 1} />
            {t.label && (
              <text
                x={t.x} y={HORIZON_Y + 46} textAnchor="middle"
                fontSize={t.label === "N" ? 10 : 9}
                fontWeight={t.label === "N" ? 700 : 500}
                fill={t.label === "N" ? cardinalN : tapeLabel}
                fontFamily="system-ui"
              >
                {t.label}
              </text>
            )}
          </g>
        ))}

        {/* Facing indicator — center line when compass is live */}
        {liveHeading && panCenter == null && (
          <g>
            <line x1={W / 2} y1={TOP_PAD} x2={W / 2} y2={HORIZON_Y + 34} stroke={facingColor} strokeWidth={1} strokeDasharray="2 4" />
            <text x={W / 2} y={TOP_PAD - 4} textAnchor="middle" fontSize={8} fill={facingColor} fontFamily="system-ui">
              facing {Math.round(headingDeg!)}°
            </text>
          </g>
        )}

        {/* Off-view indicator — everything interesting is outside the current view */}
        {(() => {
          const targetAz = riseAzimuthDeg ?? peak?.azimuthDeg ?? null;
          if (targetAz == null) return null;
          const rel = wrap180(targetAz - viewCenter);
          if (Math.abs(rel) <= FOV / 2) return null;
          const left = rel < 0;
          const ex = left ? 14 : W - 14;
          return (
            <g opacity={0.8}>
              <text x={ex} y={HORIZON_Y - 8} textAnchor={left ? "start" : "end"} fontSize={9} fill={riseSetColor} fontFamily="system-ui">
                {left ? "◀ moon path" : "moon path ▶"}
              </text>
            </g>
          );
        })()}

        {/* Turn hint pill */}
        {hint && panCenter == null && (
          <g>
            <rect x={W / 2 - 70} y={H - 20} width={140} height={17} rx={8.5} fill={nightMode ? "rgba(180,0,0,0.1)" : "rgba(255,255,255,0.06)"} stroke={lineColor} strokeWidth={0.5} />
            <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={9} fill={hint.delta === 0 ? riseSetColor : nowColor} fontFamily="system-ui">
              {hint.text}
            </text>
          </g>
        )}
      </svg>

      {/* Re-center button after manual pan */}
      {panCenter != null && (
        <button
          onClick={() => setPanCenter(null)}
          className={`absolute top-1 right-1 text-[10px] px-2 py-1 rounded-full border transition-colors ${
            nightMode
              ? "text-red-500/80 border-red-900/40 hover:bg-red-950/30"
              : "text-indigo-300 border-white/10 bg-white/5 hover:bg-white/10"
          }`}
        >
          {liveHeading ? "Follow compass" : "Re-center"}
        </button>
      )}
    </div>
  );
}
