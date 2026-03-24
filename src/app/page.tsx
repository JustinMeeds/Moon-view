"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getMoonPosition, getMoonPhase, getMoonTimes } from "@/lib/moon";
import { formatAltitude, formatTime, formatDeg, formatDateLabel } from "@/lib/utils";
import { Compass } from "@/components/Compass";
import { LocationBar } from "@/components/LocationBar";
import { NoLocation } from "@/components/NoLocation";
import { Countdown } from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Moon, Sunrise, Sunset } from "lucide-react";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function HomePage() {
  const { location, preferences, requestLocation, dayOffset, setDayOffset } = useApp();
  const now = useNow();

  useEffect(() => {
    if (!location) requestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!location) return <NoLocation />;

  const isToday = dayOffset === 0;

  const displayDate = (() => {
    if (isToday) return now;
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(12, 0, 0, 0);
    return d;
  })();

  const moonPos   = getMoonPosition(displayDate, location);
  const moonPhase = getMoonPhase(displayDate);
  const moonTimes = getMoonTimes(displayDate, location);

  const { use24h, useCardinal, nightMode } = preferences;

  const directionLabel = useCardinal
    ? `${moonPos.cardinal} (${formatDeg(moonPos.azimuthDeg)})`
    : formatDeg(moonPos.azimuthDeg);

  const dayLabel =
    isToday        ? "Today"
    : dayOffset === 1  ? "Tomorrow"
    : dayOffset === -1 ? "Yesterday"
    : formatDateLabel(displayDate);

  const graphLabel =
    isToday        ? "Tonight's Graph"
    : dayOffset === 1  ? "Tomorrow's Graph"
    : `${formatDateLabel(displayDate)} Graph`;

  return (
    <div className="px-4 pt-2 space-y-5">
      <LocationBar />

      {/* Date navigator */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setDayOffset(dayOffset - 1)} className="shrink-0 w-9 h-9">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-sm font-medium text-white">{dayLabel}</p>
          <p className="text-xs text-white/40">
            {formatDateLabel(displayDate)}{isToday ? ` · ${formatTime(now, use24h)}` : ""}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDayOffset(dayOffset + 1)} className="shrink-0 w-9 h-9">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {!isToday && (
        <button
          onClick={() => setDayOffset(0)}
          className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-0.5 -mt-2"
        >
          ← Back to today
        </button>
      )}

      {isToday && <Countdown location={location} use24h={use24h} />}

      {/* Hero readout */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3 flex-1">
          {isToday ? (
            moonPos.isVisible
              ? <Badge variant="success">Visible Now</Badge>
              : <Badge variant="muted">Below Horizon</Badge>
          ) : (
            <Badge variant="default">{dayOffset > 0 ? "Upcoming" : "Past"}</Badge>
          )}

          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{moonPhase.emoji}</span>
            <div>
              <p className="text-sm text-white/70 leading-tight">{moonPhase.label}</p>
              <p className="text-xs text-white/30">{Math.round(moonPhase.fraction * 100)}% lit</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Direction</p>
            <p className="text-2xl font-bold tracking-tight text-white leading-tight">
              {directionLabel}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Altitude</p>
            <p className={`text-2xl font-bold leading-tight ${moonPos.isVisible ? "text-white" : "text-white/40"}`}>
              {formatAltitude(moonPos.altitudeDeg)}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <Compass
            azimuthDeg={moonPos.azimuthDeg}
            altitudeDeg={moonPos.altitudeDeg}
            size={168}
            nightMode={nightMode}
          />
        </div>
      </div>

      {/* Moonrise / Moonset */}
      <Card>
        <CardHeader><CardTitle>{dayLabel}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Sunrise className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wide">Moonrise</p>
                <p className="text-base font-semibold text-white">
                  {moonTimes.rise ? formatTime(moonTimes.rise, use24h) : moonTimes.alwaysUp ? "Always up" : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                <Sunset className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wide">Moonset</p>
                <p className="text-base font-semibold text-white">
                  {moonTimes.set ? formatTime(moonTimes.set, use24h) : moonTimes.alwaysDown ? "Always down" : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Illumination */}
      <Card>
        <CardHeader><CardTitle>Illumination</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{moonPhase.label}</span>
              <span className="text-white font-semibold">{Math.round(moonPhase.fraction * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${moonPhase.fraction * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Link href="/tonight">
        <Button variant="secondary" size="lg" className="w-full">
          <Moon className="w-5 h-5" />
          {graphLabel}
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}
