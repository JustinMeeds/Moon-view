"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { getMoonPhase, getMoonTimes, buildNightChart, ChartPoint } from "@/lib/moon";
import { formatTime, formatDateLabel, formatAltitude } from "@/lib/utils";
import { MoonChart } from "@/components/MoonChart";
import { SkyDome } from "@/components/SkyDome";
import { NoLocation } from "@/components/NoLocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sunrise, Sunset, TrendingUp, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

function findNextPhaseDate(targetLabel: "Full Moon" | "New Moon"): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 35; i++) {
    if (getMoonPhase(d).label === targetLabel) return new Date(d);
    d.setDate(d.getDate() + 1);
  }
  return d;
}

const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startPad = firstDay.getDay(); // 0=Sun
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d));
  return days;
}

export default function CalendarPage() {
  const router = useRouter();
  const { location, preferences, setDayOffset } = useApp();

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);

  const calDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Pre-compute phase emoji for each day — fast sync SunCalc
  const dayData = useMemo(() => {
    return calDays.map((d) => {
      if (!d) return null;
      const phase = getMoonPhase(d);
      return { phase };
    });
  }, [calDays]);

  const summary = useMemo(() => {
    if (!selectedDate || !location) return null;
    return buildNightChart(selectedDate, location);
  }, [selectedDate, location]);

  const moonTimesSelected = useMemo(() => {
    if (!selectedDate || !location) return null;
    return getMoonTimes(selectedDate, location);
  }, [selectedDate, location]);

  const handleScrub = useCallback((point: ChartPoint) => setActivePoint(point), []);

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
    setSelectedDate(null);
    setActivePoint(null);
  };

  const handleSelectDay = (d: Date) => {
    if (selectedDate?.getTime() === d.getTime()) {
      setSelectedDate(null);
      setActivePoint(null);
    } else {
      setSelectedDate(d);
      setActivePoint(null);
    }
  };

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  if (!location) return <NoLocation />;

  const { use24h, useCardinal, nightMode } = preferences;

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString([], {
    month: "long", year: "numeric",
  });

  const formatDir = (p: ChartPoint | null) => {
    if (!p) return "—";
    return useCardinal ? `${p.cardinal} ${p.azimuthDeg.toFixed(0)}°` : `${p.azimuthDeg.toFixed(0)}°`;
  };

  const current = activePoint ?? summary?.peak ?? null;

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Month navigator */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)} className="shrink-0 w-9 h-9">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center text-lg font-bold text-white">{monthLabel}</h1>
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)} className="shrink-0 w-9 h-9">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Phase shortcuts */}
      <div className="flex gap-2 -mt-1">
        {(["Full Moon", "New Moon"] as const).map((label) => {
          const emoji = label === "Full Moon" ? "🌕" : "🌑";
          return (
            <button
              key={label}
              onClick={() => {
                const d = findNextPhaseDate(label);
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
                setSelectedDate(d);
                setActivePoint(null);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span>{emoji}</span>
              Next {label}
            </button>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div>
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((h) => (
            <div key={h} className="text-center text-[10px] text-white/30 uppercase tracking-widest py-1">
              {h}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px">
          {calDays.map((d, i) => {
            if (!d) return <div key={`pad-${i}`} />;
            const data = dayData[i];
            const selected = selectedDate?.getTime() === d.getTime();
            const today_ = isToday(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => handleSelectDay(d)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 rounded-xl transition-colors gap-0.5",
                  selected
                    ? "bg-indigo-600/30 border border-indigo-500/30"
                    : today_
                    ? "bg-white/10 border border-white/20"
                    : "hover:bg-white/5"
                )}
              >
                <span
                  className={cn(
                    "text-sm leading-none",
                    selected ? "text-indigo-300 font-bold" : today_ ? "text-white font-semibold" : "text-white/70"
                  )}
                >
                  {d.getDate()}
                </span>
                <span className="text-base leading-none" title={data?.phase.label}>
                  {data?.phase.emoji}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date detail */}
      {selectedDate && summary && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{formatDateLabel(selectedDate)}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const sel = new Date(selectedDate);
                  sel.setHours(0, 0, 0, 0);
                  const diff = Math.round((sel.getTime() - today.getTime()) / 86400000);
                  setDayOffset(diff);
                  router.push("/tonight");
                }}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View night <ArrowRight className="w-3 h-3" />
              </button>
              <button onClick={() => { setSelectedDate(null); setActivePoint(null); }} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 border border-white/10 rounded-xl py-2 px-1">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Phase</p>
              <p className="text-xl">{summary.phase.emoji}</p>
              <p className="text-[10px] text-white/50 mt-0.5">{Math.round(summary.phase.fraction * 100)}%</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl py-2 px-1">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Rise</p>
              <p className="text-sm font-semibold text-white leading-tight mt-0.5">
                {moonTimesSelected?.rise ? formatTime(moonTimesSelected.rise, use24h) : "—"}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl py-2 px-1">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Set</p>
              <p className="text-sm font-semibold text-white leading-tight mt-0.5">
                {moonTimesSelected?.set ? formatTime(moonTimesSelected.set, use24h) : "—"}
              </p>
            </div>
          </div>

          {/* Scrubber readout */}
          {current && (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <div className="text-center">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Time</p>
                <p className="text-base font-bold text-white">{formatTime(current.time, use24h)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Alt</p>
                <p className={`text-base font-bold ${current.isVisible ? "text-white" : "text-white/40"}`}>
                  {formatAltitude(current.altitudeDeg)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Dir</p>
                <p className="text-base font-bold text-indigo-300">{formatDir(current)}</p>
              </div>
            </div>
          )}

          {/* Altitude chart */}
          <Card>
            <CardHeader><CardTitle>Altitude</CardTitle></CardHeader>
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
                size={240}
              />
            </CardContent>
          </Card>

          {/* Best window */}
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
                    {summary.peak && (
                      <p className="text-xs text-white/50 mt-0.5">
                        Peak {formatAltitude(summary.peak.altitudeDeg)} at {formatTime(summary.peak.time, use24h)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rise/Peak/Set summary */}
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
                    <TrendingUp className="w-4 h-4 text-indigo-400" />Peak
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
        </div>
      )}

      {/* Empty state */}
      {!selectedDate && (
        <p className="text-center text-sm text-white/30 py-4">
          Tap any day to see moon details
        </p>
      )}
    </div>
  );
}
