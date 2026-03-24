"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getMoonPosition, getMoonPhase, getMoonTimes } from "@/lib/moon";
import { formatAltitude, formatTime, formatDeg, formatDateLabel } from "@/lib/utils";
import { Compass } from "@/components/Compass";
import { LocationBar } from "@/components/LocationBar";
import { NoLocation } from "@/components/NoLocation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Moon, Sunrise, Sunset } from "lucide-react";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function HomePage() {
  const { location, preferences, requestLocation } = useApp();
  const now = useNow();

  useEffect(() => {
    if (!location) requestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!location) {
    return <NoLocation />;
  }

  const moonPos = getMoonPosition(now, location);
  const moonPhase = getMoonPhase(now);
  const moonTimes = getMoonTimes(now, location);

  const { use24h, useCardinal } = preferences;

  const directionLabel = useCardinal
    ? `${moonPos.cardinal} (${formatDeg(moonPos.azimuthDeg)})`
    : formatDeg(moonPos.azimuthDeg);

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <LocationBar />
        <p className="text-xs text-white/40 pl-6">
          {formatDateLabel(now)} · {formatTime(now, use24h)}
        </p>
      </div>

      {/* Hero readout */}
      <div className="flex items-center justify-between gap-4">
        {/* Text readout */}
        <div className="space-y-3 flex-1">
          {moonPos.isVisible ? (
            <Badge variant="success">Visible Now</Badge>
          ) : (
            <Badge variant="muted">Below Horizon</Badge>
          )}

          {/* Phase */}
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">{moonPhase.emoji}</span>
            <div>
              <p className="text-sm text-white/70 leading-tight">{moonPhase.label}</p>
              <p className="text-xs text-white/30">{Math.round(moonPhase.fraction * 100)}% lit</p>
            </div>
          </div>

          {/* Direction */}
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Direction</p>
            <p className="text-2xl font-bold tracking-tight text-white leading-tight">
              {directionLabel}
            </p>
          </div>

          {/* Altitude */}
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Altitude</p>
            <p className={`text-2xl font-bold leading-tight ${moonPos.isVisible ? "text-white" : "text-white/40"}`}>
              {formatAltitude(moonPos.altitudeDeg)}
            </p>
          </div>
        </div>

        {/* Compass */}
        <div className="shrink-0">
          <Compass
            azimuthDeg={moonPos.azimuthDeg}
            altitudeDeg={moonPos.altitudeDeg}
            size={168}
          />
        </div>
      </div>

      {/* Moonrise / Moonset */}
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Sunrise className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wide">Moonrise</p>
                <p className="text-base font-semibold text-white">
                  {moonTimes.rise
                    ? formatTime(moonTimes.rise, use24h)
                    : moonTimes.alwaysUp
                    ? "Always up"
                    : "—"}
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
                  {moonTimes.set
                    ? formatTime(moonTimes.set, use24h)
                    : moonTimes.alwaysDown
                    ? "Always down"
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Illumination bar */}
      <Card>
        <CardHeader>
          <CardTitle>Illumination</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{moonPhase.label}</span>
              <span className="text-white font-semibold">
                {Math.round(moonPhase.fraction * 100)}%
              </span>
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

      {/* CTA */}
      <Link href="/tonight">
        <Button variant="secondary" size="lg" className="w-full">
          <Moon className="w-5 h-5" />
          Tonight&apos;s Graph
          <ArrowRight className="w-4 h-4 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}
