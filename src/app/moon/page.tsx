"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { buildNightChart, getMoonPhase, getMoonTimes, ChartPoint } from "@/lib/moon";
import { getSolunarWindows } from "@/lib/solunar";
import { formatTime, formatAltitude, formatDateLabel } from "@/lib/utils";
import { MoonChart } from "@/components/MoonChart";
import { SkyDome } from "@/components/SkyDome";
import { SolunarChart } from "@/components/SolunarChart";
import { NoLocation } from "@/components/NoLocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sunrise, Sunset, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Countdown } from "@/components/Countdown";

export default function MoonPage() {
  const { location, preferences, dayOffset, setDayOffset } = useApp();
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);
  const handleScrub = useCallback((p: ChartPoint) => setActivePoint(p), []);

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);

  const now = new Date();

  const summary = useMemo(() => {
    if (!location) return null;
    return buildNightChart(baseDate, location);
  }, [location, baseDate]);

  const solunarWindows = useMemo(() => {
    if (!location) return [];
    return getSolunarWindows(baseDate, location);
  }, [location, baseDate]);

  const phase = useMemo(() => getMoonPhase(baseDate), [baseDate]);

  // 7-day phase strip
  const weekPhases = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return { date: d, phase: getMoonPhase(d) };
      }),
    []
  );

  const moonTimes = useMemo(() => {
    if (!location) return null;
    return getMoonTimes(baseDate, location);
  }, [location, baseDate]);

  if (!location) return <div className="px-4 pt-4"><NoLocation /></div>;
  if (!summary) return null;

  const { use24h, useCardinal, nightMode } = preferences;
  const current = activePoint ?? summary.peak ?? summary.chartPoints[0];
  const isToday = dayOffset === 0;

  // Fishing impact note based on moon phase
  function fishingNote(fraction: number): string {
    const pct = fraction * 100;
    if (pct >= 90) return "Full moon — strong feeding activity expected near dawn and dusk. Fish may be active all night.";
    if (pct >= 75) return "Waxing gibbous — good feeding windows, especially around solunar peaks.";
    if (pct >= 40 && pct <= 60) return "Quarter moon — moderate conditions. Focus on solunar windows.";
    if (pct <= 10) return "New moon — excellent fishing. No moonlight means less night-feeding for prey, triggering aggressive daytime feeding.";
    return "Solunar windows remain the best predictor regardless of moon phase.";
  }

  return (
    <div className="px-4 pt-3 space-y-3">
      {/* Day nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setDayOffset(dayOffset - 1); setActivePoint(null); }} className="p-2 text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {isToday ? "Tonight" : dayOffset === 1 ? "Tomorrow night" : formatDateLabel(baseDate)}
          </p>
          {isToday && <p className="text-xs text-white/40">{now.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}</p>}
        </div>
        <button onClick={() => { setDayOffset(dayOffset + 1); setActivePoint(null); }} className="p-2 text-white/50 hover:text-white transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Countdown (today only) */}
      {isToday && <Countdown location={location} use24h={use24h} />}

      {/* Phase display */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{phase.emoji}</span>
            <div>
              <p className="text-base font-semibold text-white">{phase.label}</p>
              <p className="text-sm text-white/60">{Math.round(phase.fraction * 100)}% illuminated</p>
              <p className="text-xs text-white/40 mt-0.5">{fishingNote(phase.fraction)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rise / Set times */}
      {moonTimes && (
        <Card>
          <CardHeader><CardTitle>Rise &amp; Set</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <Sunrise className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-white/80">
                  {moonTimes.alwaysUp ? "Always up" : moonTimes.rise ? formatTime(moonTimes.rise, use24h) : "—"}
                </p>
                <p className="text-xs text-white/40">Rise</p>
              </div>
              <div>
                <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-white/80">{summary.peak ? formatTime(summary.peak.time, use24h) : "—"}</p>
                <p className="text-xs text-white/40">Peak</p>
              </div>
              <div>
                <Sunset className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <p className="text-white/80">
                  {moonTimes.alwaysDown ? "Always down" : moonTimes.set ? formatTime(moonTimes.set, use24h) : "—"}
                </p>
                <p className="text-xs text-white/40">Set</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Solunar windows */}
      <Card>
        <CardHeader><CardTitle>Solunar Windows</CardTitle></CardHeader>
        <CardContent>
          <SolunarChart windows={solunarWindows} now={now} use24h={use24h} />
        </CardContent>
      </Card>

      {/* Altitude chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Altitude Chart (6 PM–6 AM)</CardTitle>
            <Badge variant={current.isVisible ? "success" : "muted"}>
              {current.isVisible ? "Visible" : "Below Horizon"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {current && (
            <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs text-white/60">
              <div><p className="font-medium text-white/90">{formatTime(current.time, use24h)}</p><p>Time</p></div>
              <div><p className="font-medium text-white/90">{formatAltitude(current.altitudeDeg)}</p><p>Altitude</p></div>
              <div><p className="font-medium text-white/90">{useCardinal ? `${current.cardinal} ${current.azimuthDeg.toFixed(0)}°` : `${current.azimuthDeg.toFixed(0)}°`}</p><p>Direction</p></div>
            </div>
          )}
          <MoonChart
            data={summary.chartPoints}
            moonrise={summary.moonrise}
            moonset={summary.moonset}
            peak={summary.peak}
            use24h={use24h}
            nightMode={nightMode}
            onScrub={handleScrub}
          />
        </CardContent>
      </Card>

      {/* Sky dome */}
      <Card>
        <CardHeader><CardTitle>Sky View</CardTitle></CardHeader>
        <CardContent className="flex justify-center">
          <SkyDome data={summary.chartPoints} moonrise={summary.moonrise} moonset={summary.moonset} peak={summary.peak} use24h={use24h} nightMode={nightMode} />
        </CardContent>
      </Card>

      {/* 7-day phase strip */}
      <Card>
        <CardHeader><CardTitle>7-Day Phase</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekPhases.map(({ date, phase: p }, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-xl">{p.emoji}</span>
                <span className="text-[9px] text-white/40">
                  {date.toLocaleDateString("en-CA", { weekday: "short" })}
                </span>
                <span className="text-[9px] text-white/30">{Math.round(p.fraction * 100)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
