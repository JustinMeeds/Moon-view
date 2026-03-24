"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { buildNightChart, ChartPoint } from "@/lib/moon";
import { formatTime, formatDateLabel, formatAltitude } from "@/lib/utils";
import { MoonChart } from "@/components/MoonChart";
import { SkyDome } from "@/components/SkyDome";
import { NoLocation } from "@/components/NoLocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sunrise, Sunset, TrendingUp } from "lucide-react";
import { Countdown } from "@/components/Countdown";

export default function TonightPage() {
  const { location, preferences, dayOffset, setDayOffset } = useApp();
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);

  const shiftDay = (delta: number) => {
    setDayOffset(dayOffset + delta);
    setActivePoint(null);
  };

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const summary = useMemo(() => {
    if (!location) return null;
    return buildNightChart(baseDate, location);
  }, [location, baseDate]);

  const handleScrub = useCallback((point: ChartPoint) => setActivePoint(point), []);

  if (!location) return <NoLocation />;
  if (!summary) return null;

  const { use24h, useCardinal, nightMode } = preferences;
  const current = activePoint ?? summary.peak;

  const isToday   = dayOffset === 0;
  const dayLabel  = isToday ? "Tonight" : dayOffset === 1 ? "Tomorrow night" : formatDateLabel(baseDate);

  const formatDir = (p: ChartPoint | null) => {
    if (!p) return "—";
    return useCardinal ? `${p.cardinal} ${p.azimuthDeg.toFixed(0)}°` : `${p.azimuthDeg.toFixed(0)}°`;
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Date navigator */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)} className="shrink-0 w-9 h-9">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-lg font-bold text-white">{dayLabel}</h1>
          <p className="text-xs text-white/40">{formatDateLabel(baseDate)} · 6 PM → 6 AM</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => shiftDay(1)} className="shrink-0 w-9 h-9">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
      {dayOffset !== 0 && (
        <button
          onClick={() => { setDayOffset(0); setActivePoint(null); }}
          className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-0.5 -mt-2"
        >
          ← Back to tonight
        </button>
      )}

      {/* Countdown to next rise/set — today only */}
      {dayOffset === 0 && <Countdown location={location} use24h={use24h} />}

      {/* Scrubber readout */}
      {current && (
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Time</p>
            <p className="text-lg font-bold text-white">{formatTime(current.time, use24h)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Altitude</p>
            <p className={`text-lg font-bold ${current.isVisible ? "text-white" : "text-white/40"}`}>
              {formatAltitude(current.altitudeDeg)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Direction</p>
            <p className="text-lg font-bold text-indigo-300">{formatDir(current)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Status</p>
            {current.isVisible
              ? <Badge variant="success" className="text-[10px] py-0.5">Visible</Badge>
              : <Badge variant="muted" className="text-[10px] py-0.5">Below</Badge>}
          </div>
        </div>
      )}

      {/* Altitude chart */}
      <Card>
        <CardHeader><CardTitle>Altitude Over Time</CardTitle></CardHeader>
        <CardContent>
          <MoonChart
            data={summary.chartPoints}
            moonrise={summary.moonrise}
            moonset={summary.moonset}
            peak={summary.peak}
            use24h={use24h}
            nightMode={nightMode}
            onScrub={handleScrub}
          />
          <div className="flex gap-4 mt-3 text-[10px] text-white/40">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 border-t border-dashed border-amber-400/50" />Moonrise/set
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 border-t border-dashed border-indigo-400/50" />Peak
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 border-t border-dashed border-white/25" />Horizon
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Sky dome */}
      <Card>
        <CardHeader><CardTitle>Sky Path</CardTitle></CardHeader>
        <CardContent>
          <SkyDome
            data={summary.chartPoints}
            highlightTime={activePoint?.time ?? null}
            moonrise={summary.moonrise}
            moonset={summary.moonset}
            peak={summary.peak}
            use24h={use24h}
            nightMode={nightMode}
            size={260}
          />
          <p className="text-[10px] text-white/30 text-center mt-2">
            Polar view — N at top, horizon at edge. Drag the chart slider to move the dot.
          </p>
        </CardContent>
      </Card>

      {/* Night summary */}
      <Card>
        <CardHeader><CardTitle>Night Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Sunrise className="w-4 h-4 text-amber-400" />Moonrise
              </div>
              <span className="text-sm font-semibold text-white">
                {summary.moonrise ? formatTime(summary.moonrise, use24h) : "—"}
              </span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <TrendingUp className="w-4 h-4 text-indigo-400" />Peak altitude
              </div>
              <span className="text-sm font-semibold text-white">
                {summary.peak
                  ? `${formatAltitude(summary.peak.altitudeDeg)} at ${formatTime(summary.peak.time, use24h)}`
                  : "—"}
              </span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Sunset className="w-4 h-4 text-indigo-400" />Moonset
              </div>
              <span className="text-sm font-semibold text-white">
                {summary.moonset ? formatTime(summary.moonset, use24h) : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {summary.bestWindowStart && summary.bestWindowEnd && (
        <Card>
          <CardHeader><CardTitle>Best Viewing Window</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔭</span>
              <div>
                <p className="text-white font-semibold">
                  {formatTime(summary.bestWindowStart, use24h)} → {formatTime(summary.bestWindowEnd, use24h)}
                </p>
                <p className="text-xs text-white/50 mt-0.5">Moon is above the horizon during this window.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Phase</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{summary.phase.emoji}</span>
            <div>
              <p className="text-white font-semibold">{summary.phase.label}</p>
              <p className="text-sm text-white/50">{Math.round(summary.phase.fraction * 100)}% illuminated</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
