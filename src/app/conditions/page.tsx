"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { getMoonPhase } from "@/lib/moon";
import { getWaterTemp } from "@/lib/waterTemp";
import { getPressurePoints, getPressureTrendLabel, getPressureImplication } from "@/lib/weather";
import { azimuthToCardinal } from "@/lib/utils";
import { PressureChart } from "@/components/PressureChart";
import { NoLocation } from "@/components/NoLocation";
import { Compass } from "@/components/Compass";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Thermometer, Wind, Droplets, Cloud, Eye, Gauge } from "lucide-react";
import type { WaterTempResult } from "@/lib/waterTemp";

export default function ConditionsPage() {
  const { location, weatherData, weatherLoading, weatherError, weatherStaleMs, refreshWeather, preferences } = useApp();
  const [waterTemp, setWaterTemp] = useState<WaterTempResult | null>(null);
  const [waterTempLoading, setWaterTempLoading] = useState(false);
  const now = new Date();

  // Load water temp when location and weather are available
  useEffect(() => {
    if (!location || !weatherData) return;
    setWaterTempLoading(true);
    getWaterTemp(
      location.lat,
      location.lng,
      weatherData.current.airTempC,
      now.getMonth()
    ).then(setWaterTemp).catch(() => {}).finally(() => setWaterTempLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng, weatherData?.fetchedAt]);

  if (!location) return <div className="px-4 pt-4"><NoLocation /></div>;

  const pressurePoints = weatherData ? getPressurePoints(weatherData.hourly, now) : null;
  const pressureDelta = pressurePoints
    ? pressurePoints.pressureNow - pressurePoints.pressure3hAgo
    : null;
  const trendLabel = pressureDelta !== null ? getPressureTrendLabel(pressureDelta) : "→ Unknown";
  const implication = pressureDelta !== null ? getPressureImplication(pressureDelta) : "";

  // Pressure sparkline data: last 24h + next 12h
  const pressureChartData = useMemo(() => {
    if (!weatherData) return [];
    const nowMs = Date.now();
    return weatherData.hourly
      .filter((h) => h.time >= nowMs - 24 * 3600 * 1000 && h.time <= nowMs + 12 * 3600 * 1000)
      .map((h) => ({ time: h.time, hPa: h.pressureHpa }));
  }, [weatherData]);

  // Find current hourly entry
  const currentHourly = useMemo(() => {
    if (!weatherData) return null;
    const nowMs = Date.now();
    return weatherData.hourly.find((h) => Math.abs(h.time - nowMs) < 30 * 60 * 1000) ?? null;
  }, [weatherData]);

  // 12h forecast strip (next 12 entries)
  const forecastStrip = useMemo(() => {
    if (!weatherData) return [];
    const nowMs = Date.now();
    return weatherData.hourly.filter((h) => h.time > nowMs).slice(0, 12);
  }, [weatherData]);

  // Tomorrow summary
  const tomorrow = useMemo(() => {
    if (!weatherData) return null;
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);
    const hrs = weatherData.hourly.filter(
      (h) => h.time >= tomorrowStart.getTime() && h.time <= tomorrowEnd.getTime()
    );
    if (!hrs.length) return null;
    return {
      high: Math.max(...hrs.map((h) => h.airTempC)),
      low: Math.min(...hrs.map((h) => h.airTempC)),
      maxWind: Math.max(...hrs.map((h) => h.windKmh)),
      maxPrecip: Math.max(...hrs.map((h) => h.precipProb)),
    };
  }, [weatherData]);

  const moonPhase = getMoonPhase(now);
  const showStale = weatherStaleMs !== null && weatherStaleMs > 2 * 60 * 60 * 1000;

  return (
    <div className="px-4 pt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-white">Conditions</h1>
        <button
          onClick={refreshWeather}
          disabled={weatherLoading}
          className="text-xs text-emerald-400 flex items-center gap-1 hover:text-emerald-300 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${weatherLoading ? "animate-spin" : ""}`} />
          {weatherLoading ? "Updating…" : "Refresh"}
        </button>
      </div>

      {/* Stale warning */}
      {showStale && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Conditions last updated {Math.floor(weatherStaleMs! / 3600000)}h ago
        </div>
      )}

      {/* Section 1 — Current weather */}
      <Card>
        <CardHeader><CardTitle>Current Weather</CardTitle></CardHeader>
        <CardContent>
          {weatherData ? (
            <div className="space-y-3">
              {/* Temp + humidity row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-white">{weatherData.current.airTempC.toFixed(1)}°C</p>
                    <p className="text-xs text-white/40">Air temperature</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-white">{currentHourly?.humidityPct ?? "—"}%</p>
                    <p className="text-xs text-white/40">Humidity</p>
                  </div>
                </div>
              </div>

              {/* Wind with compass */}
              <div className="flex items-center gap-4 pt-1">
                <div className="shrink-0">
                  <Compass
                    azimuthDeg={weatherData.current.windDirDeg}
                    altitudeDeg={0}
                    size={72}
                    nightMode={preferences.nightMode}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {Math.round(weatherData.current.windKmh)} km/h{" "}
                    {azimuthToCardinal(weatherData.current.windDirDeg)}
                  </p>
                  <p className="text-xs text-white/40">Wind direction</p>
                </div>
              </div>

              {/* Cloud + precip */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm text-white/80">{currentHourly?.cloudCoverPct ?? "—"}%</p>
                    <p className="text-xs text-white/40">Cloud cover</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <p className="text-sm text-white/80">{currentHourly?.precipProb ?? "—"}% chance</p>
                    <p className="text-xs text-white/40">Precipitation</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-5 bg-white/5 rounded animate-pulse"/>)}</div>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Barometric pressure */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-violet-400" />
            <CardTitle>Barometric Pressure</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {pressureChartData.length > 0 ? (
            <PressureChart
              data={pressureChartData}
              trendLabel={`${pressurePoints?.pressureNow.toFixed(1) ?? "—"} hPa · ${trendLabel}`}
              implication={implication}
              use24h={preferences.use24h}
            />
          ) : (
            <div className="h-24 bg-white/5 rounded animate-pulse" />
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Water temperature */}
      <Card>
        <CardHeader><CardTitle>Water Temperature</CardTitle></CardHeader>
        <CardContent>
          {waterTempLoading ? (
            <div className="h-8 bg-white/5 rounded animate-pulse" />
          ) : waterTemp ? (
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-white">
                  {waterTemp.source === "estimated" ? "~" : ""}{waterTemp.tempC.toFixed(1)}°C
                </span>
                <span className="text-xs text-white/40">
                  {waterTemp.source === "eccc"
                    ? `ECCC: ${waterTemp.stationName}${waterTemp.ageMs ? `, ${Math.round(waterTemp.ageMs / 3600000)}h ago` : ""}`
                    : "estimated from air temperature"}
                </span>
              </div>
              {waterTemp.source === "estimated" && (
                <p className="text-xs text-white/35 leading-relaxed">
                  Water temp estimates are least accurate during rapid weather changes. Verify locally for sensitive conditions.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40">Water temperature unavailable</p>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Forecast strip */}
      <Card>
        <CardHeader><CardTitle>Next 12 Hours</CardTitle></CardHeader>
        <CardContent>
          {forecastStrip.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {forecastStrip.map((h) => (
                <div key={h.time} className="flex flex-col items-center gap-0.5 shrink-0 min-w-[44px]">
                  <span className="text-[10px] text-white/40">
                    {new Date(h.time).toLocaleTimeString("en-CA", { hour: "numeric" })}
                  </span>
                  <span className="text-sm text-white/80">{h.airTempC.toFixed(0)}°</span>
                  <span className="text-[10px] text-sky-400">{h.precipProb}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-10 bg-white/5 rounded animate-pulse" />
          )}
        </CardContent>
      </Card>

      {/* Tomorrow summary */}
      {tomorrow && (
        <Card>
          <CardHeader><CardTitle>Tomorrow</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-white/80 font-medium">
                  {tomorrow.high.toFixed(0)}° / {tomorrow.low.toFixed(0)}°C
                </span>
                <p className="text-xs text-white/40">High / Low</p>
              </div>
              <div>
                <span className="text-white/80 font-medium">{tomorrow.maxPrecip}% precip</span>
                <p className="text-xs text-white/40">Max precipitation chance</p>
              </div>
              <div>
                <span className="text-white/80 font-medium">{Math.round(tomorrow.maxWind)} km/h max wind</span>
                <p className="text-xs text-white/40">Wind</p>
              </div>
              <div>
                <span className="text-white/80 font-medium">{moonPhase.emoji} {moonPhase.label}</span>
                <p className="text-xs text-white/40">Moon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {weatherError && (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {weatherError}
        </div>
      )}
    </div>
  );
}
