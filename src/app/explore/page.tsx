"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { buildNightChart, ChartPoint } from "@/lib/moon";
import { formatTime, formatDateLabel, formatAltitude } from "@/lib/utils";
import { MoonChart } from "@/components/MoonChart";
import { NoLocation } from "@/components/NoLocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Sunrise, Sunset, TrendingUp } from "lucide-react";

function dateToInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function inputValueToDate(s: string) {
  // Parse YYYY-MM-DD as local date midnight
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export default function ExplorePage() {
  const { location, preferences } = useApp();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);

  const summary = useMemo(() => {
    if (!location) return null;
    return buildNightChart(selectedDate, location);
  }, [location, selectedDate]);

  const handleScrub = useCallback((point: ChartPoint) => {
    setActivePoint(point);
  }, []);

  const shiftDate = (days: number) => {
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + days);
      return next;
    });
    setActivePoint(null);
  };

  if (!location) return <NoLocation />;
  if (!summary) return null;

  const { use24h, useCardinal } = preferences;
  const current = activePoint ?? summary.peak;

  const formatDir = (p: ChartPoint | null) => {
    if (!p) return "—";
    return useCardinal ? `${p.cardinal} ${p.azimuthDeg.toFixed(0)}°` : `${p.azimuthDeg.toFixed(0)}°`;
  };

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Date Explorer</h1>
        <p className="text-xs text-white/40 mt-0.5">Pick any date to explore the Moon</p>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)} className="shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <input
            type="date"
            value={dateToInputValue(selectedDate)}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(inputValueToDate(e.target.value));
                setActivePoint(null);
              }
            }}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 h-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => shiftDate(1)} className="shrink-0">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Scrubber readout */}
      {current && (
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Time</p>
            <p className="text-base font-bold text-white">{formatTime(current.time, use24h)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Alt</p>
            <p className={`text-base font-bold ${current.isVisible ? "text-white" : "text-white/40"}`}>
              {formatAltitude(current.altitudeDeg)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Dir</p>
            <p className="text-base font-bold text-indigo-300">{formatDir(current)}</p>
          </div>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{formatDateLabel(selectedDate)} — Altitude</CardTitle>
        </CardHeader>
        <CardContent>
          <MoonChart
            data={summary.chartPoints}
            moonrise={summary.moonrise}
            moonset={summary.moonset}
            peak={summary.peak}
            use24h={use24h}
            onScrub={handleScrub}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Night Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Sunrise className="w-4 h-4 text-amber-400" />
                Moonrise
              </div>
              <span className="text-sm font-semibold text-white">
                {summary.moonrise ? formatTime(summary.moonrise, use24h) : "—"}
              </span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Peak altitude
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
                <Sunset className="w-4 h-4 text-indigo-400" />
                Moonset
              </div>
              <span className="text-sm font-semibold text-white">
                {summary.moonset ? formatTime(summary.moonset, use24h) : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase */}
      <Card>
        <CardHeader>
          <CardTitle>Phase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{summary.phase.emoji}</span>
            <div>
              <p className="text-white font-semibold">{summary.phase.label}</p>
              <p className="text-sm text-white/50">
                {Math.round(summary.phase.fraction * 100)}% illuminated
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best window */}
      {summary.bestWindowStart && summary.bestWindowEnd && (
        <Card>
          <CardHeader>
            <CardTitle>Best Viewing Window</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔭</span>
              <div>
                <p className="text-white font-semibold">
                  {formatTime(summary.bestWindowStart, use24h)} →{" "}
                  {formatTime(summary.bestWindowEnd, use24h)}
                </p>
                {summary.peak && (
                  <p className="text-xs text-white/50 mt-0.5">
                    Direction range: check chart for azimuth at rise and set.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
