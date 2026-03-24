"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { getMoonPhase, getMoonTimes } from "@/lib/moon";
import { getSolunarWindows } from "@/lib/solunar";
import { calculateFishingScore, getBestWindowToday } from "@/lib/score";
import { generateReason } from "@/lib/scoreReason";
import { getPressurePoints, getPressureTrendLabel, getPressureImplication } from "@/lib/weather";
import { formatTime, azimuthToCardinal } from "@/lib/utils";
import { LocationBar } from "@/components/LocationBar";
import { NoLocation } from "@/components/NoLocation";
import { FishingScore } from "@/components/FishingScore";
import { FMZBanner } from "@/components/FMZBanner";
import { FMZMapPicker } from "@/components/FMZMapPicker";
import { SolunarChart } from "@/components/SolunarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Wind, BarChart2, Droplets, Moon as MoonIcon, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { SolunarWindow } from "@/lib/solunar";
import type { ScoreResult } from "@/lib/score";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function HomePage() {
  const {
    location,
    fmz,
    fmzSource,
    setFmz,
    weatherData,
    weatherLoading,
    weatherError,
    weatherStaleMs,
    refreshWeather,
    preferences,
  } = useApp();

  const now = useNow();
  const [fmzPickerOpen, setFmzPickerOpen] = useState(false);
  const [solunarWindows, setSolunarWindows] = useState<SolunarWindow[]>([]);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [bestToday, setBestToday] = useState<{ score: number; time: Date } | null>(null);
  const [reason, setReason] = useState("");

  // Recompute solunar windows whenever location or date changes
  useEffect(() => {
    if (!location) return;
    const windows = getSolunarWindows(now, location);
    setSolunarWindows(windows);
  }, [location, now.toDateString()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recompute score whenever weather or solunar changes
  useEffect(() => {
    if (!location || !weatherData || solunarWindows.length === 0) return;

    const moonPhase = getMoonPhase(now);
    const pressurePoints = getPressurePoints(weatherData.hourly, now);

    if (!pressurePoints) return;

    const result = calculateFishingScore({
      pressureNow: pressurePoints.pressureNow,
      pressure3hAgo: pressurePoints.pressure3hAgo,
      windKmh: weatherData.current.windKmh,
      airTempC: weatherData.current.airTempC,
      monthIndex: now.getMonth(),
      solunarWindows,
      moonFraction: moonPhase.fraction,
      now,
      lat: location.lat,
    });

    setScoreResult(result);
    setReason(generateReason(result.factors, result.pressureTrend));

    // Best-today calculation
    const hourlyForScore = weatherData.hourly.map((h) => ({
      time: h.time,
      pressureHpa: h.pressureHpa,
      windKmh: h.windKmh,
      airTempC: h.airTempC,
    }));
    const best = getBestWindowToday(hourlyForScore, solunarWindows, moonPhase.fraction, now, location.lat);
    setBestToday(best);
  }, [weatherData, solunarWindows, now]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recalculate score every 30 min
  useEffect(() => {
    const id = setInterval(() => {
      if (location) refreshWeather();
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [location, refreshWeather]);

  if (!location) {
    return (
      <div className="px-4 pt-4">
        <NoLocation />
      </div>
    );
  }

  const moonPhase = getMoonPhase(now);
  const moonTimes = getMoonTimes(now, location);
  const pressurePoints = weatherData ? getPressurePoints(weatherData.hourly, now) : null;
  const pressureDelta = pressurePoints
    ? pressurePoints.pressureNow - pressurePoints.pressure3hAgo
    : null;

  const windCardinal = weatherData
    ? azimuthToCardinal(weatherData.current.windDirDeg)
    : null;

  // Stale warning: show if data is > 2h old
  const showStale = weatherStaleMs !== null && weatherStaleMs > 2 * 60 * 60 * 1000;

  return (
    <div className="px-4 pt-3 space-y-3">
      {/* Location */}
      <LocationBar />

      {/* FMZ Banner */}
      <FMZBanner
        fmz={fmz}
        source={fmzSource}
        onChangeZone={() => setFmzPickerOpen(true)}
      />

      {/* Stale data warning */}
      {showStale && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1">
            Conditions last updated {Math.floor(weatherStaleMs! / 3600000)}h ago
          </span>
          <button
            onClick={refreshWeather}
            disabled={weatherLoading}
            className="flex items-center gap-1 hover:text-amber-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      )}

      {/* Fishing Score */}
      <Card>
        <CardContent className="pt-2 pb-4">
          {scoreResult ? (
            <FishingScore
              score={scoreResult.total}
              reason={reason}
              bestToday={bestToday}
              use24h={preferences.use24h}
            />
          ) : weatherLoading ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
              <p className="text-xs text-white/30">Loading conditions…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2">
              <p className="text-3xl">🎣</p>
              <p className="text-sm text-white/50">Score available once conditions load</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solunar Windows */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Feeding Windows</CardTitle>
        </CardHeader>
        <CardContent>
          {solunarWindows.length > 0 ? (
            <SolunarChart windows={solunarWindows} now={now} use24h={preferences.use24h} />
          ) : (
            <p className="text-xs text-white/40">Calculating…</p>
          )}
        </CardContent>
      </Card>

      {/* Conditions Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          {weatherData ? (
            <div className="grid grid-cols-2 gap-3">
              {/* Air temp */}
              <Link href="/conditions" className="flex items-center gap-2 text-sm group">
                <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
                <span className="text-white/70 group-hover:text-white transition-colors">
                  {weatherData.current.airTempC.toFixed(1)}°C
                </span>
              </Link>

              {/* Wind */}
              <Link href="/conditions" className="flex items-center gap-2 text-sm group">
                <Wind className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-white/70 group-hover:text-white transition-colors">
                  {Math.round(weatherData.current.windKmh)} km/h {windCardinal}
                </span>
              </Link>

              {/* Pressure */}
              <Link href="/conditions" className="flex items-center gap-2 text-sm group">
                <BarChart2 className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-white/70 group-hover:text-white transition-colors">
                  {pressurePoints
                    ? `${pressurePoints.pressureNow.toFixed(0)} hPa ${pressureDelta !== null ? getPressureTrendLabel(pressureDelta).split(" ")[0] : ""}`
                    : "—"}
                </span>
              </Link>

              {/* Humidity */}
              <Link href="/conditions" className="flex items-center gap-2 text-sm group">
                <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-white/70 group-hover:text-white transition-colors">
                  {weatherData.hourly.find((h) => Math.abs(h.time - now.getTime()) < 30 * 60 * 1000)?.humidityPct ?? "—"}% humidity
                </span>
              </Link>

              {/* Moon */}
              <Link href="/moon" className="flex items-center gap-2 text-sm group col-span-2">
                <MoonIcon className="w-4 h-4 text-yellow-300 shrink-0" />
                <span className="text-white/70 group-hover:text-white transition-colors">
                  {moonPhase.emoji} {moonPhase.label} · {Math.round(moonPhase.fraction * 100)}%
                  {moonTimes.rise && !moonTimes.alwaysUp && (
                    <> · rises {formatTime(moonTimes.rise, preferences.use24h)}</>
                  )}
                </span>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-5 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error state */}
      {weatherError && !weatherData && (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{weatherError}</span>
        </div>
      )}

      {/* FMZ Picker */}
      <FMZMapPicker
        open={fmzPickerOpen}
        currentFmz={fmz}
        onSelect={(id) => { setFmz(id, "manual"); setFmzPickerOpen(false); }}
        onClose={() => setFmzPickerOpen(false)}
      />
    </div>
  );
}
