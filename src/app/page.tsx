"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { getMoonPosition, getMoonPhase, getMoonTimes, getLunarDistance } from "@/lib/moon";
import { getSkyEvents, type SkyEvent } from "@/lib/sun";
import { getUpcomingConjunctions, PLANET_META, type PlanetConjunction } from "@/lib/planets";
import { formatAltitude, formatTime, formatDeg, formatDateLabel } from "@/lib/utils";
import { Compass } from "@/components/Compass";
import { ElevationArc } from "@/components/ElevationArc";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { LocationBar } from "@/components/LocationBar";
import { NoLocation } from "@/components/NoLocation";
import { Countdown } from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Moon, Share2, Sunrise, Sunset, Sparkles } from "lucide-react";

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
  const [shareFeedback, setShareFeedback] = useState(false);
  const { heading, tiltDeg, permission: compassPermission, requestPermission } = useDeviceOrientation();

  useEffect(() => {
    if (!location) requestLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Read ?date=YYYY-MM-DD from URL on mount and apply as dayOffset
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    if (dateParam) {
      const [y, m, d] = dateParam.split("-").map(Number);
      const target = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
      setDayOffset(diff);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isToday = dayOffset === 0;

  const displayDate = useMemo(() => {
    if (isToday) return now;
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(12, 0, 0, 0);
    return d;
  }, [now, isToday, dayOffset]);

  // Cheap per-tick readout — recomputes as the clock advances (~every 10s),
  // but not on every compass/orientation event.
  const moonData = useMemo(() => {
    if (!location) return null;
    return {
      pos: getMoonPosition(displayDate, location),
      phase: getMoonPhase(displayDate),
      times: getMoonTimes(displayDate, location),
    };
  }, [displayDate, location]);

  // Heavy daily scans (perigee, conjunctions, sky events) keyed on the hour,
  // so they don't re-run on every render — especially compass events (~60/s).
  const hourBucket = Math.floor(now.getTime() / 3_600_000);
  const eventsData = useMemo(() => {
    if (!location || !isToday) {
      return { lunarDist: null, skyEvents: [] as SkyEvent[], conjunctions: [] as PlanetConjunction[] };
    }
    const anchor = new Date(hourBucket * 3_600_000);
    return {
      lunarDist: getLunarDistance(anchor, location),
      skyEvents: getSkyEvents(anchor, location),
      conjunctions: getUpcomingConjunctions(anchor, 14, location),
    };
  }, [location, isToday, hourBucket]);

  const handleShare = async () => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const url = `${window.location.origin}/?date=${dateStr}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Moon Tracker", text: `Moon on ${dateStr}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareFeedback(true);
        setTimeout(() => setShareFeedback(false), 2000);
      }
    } catch {}
  };

  if (!location || !moonData) return <NoLocation />;

  const { pos: moonPos, phase: moonPhase, times: moonTimes } = moonData;
  const { lunarDist, skyEvents, conjunctions } = eventsData;
  const nextConj = conjunctions[0] ?? null;

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
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          title="Share this date"
          className="shrink-0 w-9 h-9 relative"
        >
          {shareFeedback
            ? <span className="text-[10px] text-indigo-400 font-semibold">✓</span>
            : <Share2 className="w-4 h-4" />}
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
            {lunarDist && (
              <p className="text-[10px] text-white/30 mt-0.5">
                {lunarDist.distanceKm.toLocaleString()} km · {lunarDist.percentClose}% close
                {lunarDist.isSupermoon && <span className="text-amber-400 ml-1">· Supermoon</span>}
              </p>
            )}
            {tiltDeg != null && (
              <div className="mt-1.5">
                <ElevationArc
                  moonAltitudeDeg={moonPos.altitudeDeg}
                  tiltDeg={tiltDeg}
                  nightMode={nightMode}
                />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <Compass
            azimuthDeg={moonPos.azimuthDeg}
            altitudeDeg={moonPos.altitudeDeg}
            headingDeg={heading}
            size={168}
            nightMode={nightMode}
          />
          {compassPermission === "prompt" && (
            <button
              onClick={requestPermission}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
            >
              Enable live compass
            </button>
          )}
          {compassPermission === "denied" && (
            <p className="text-[10px] text-white/30">Compass denied</p>
          )}
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

      {/* Coming Up — next conjunction or sky event, today only */}
      {isToday && (nextConj || skyEvents.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Coming Up</CardTitle>
            <Link href="/events" className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              See all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextConj && (() => {
              const meta = PLANET_META[nextConj.planet];
              const daysAway = Math.round((nextConj.date.getTime() - now.getTime()) / 86_400_000);
              return (
                <div className="flex items-center gap-2 text-sm">
                  <span className={`text-base ${meta.color}`}>{meta.symbol}</span>
                  <span className="text-white">Moon near {nextConj.planet}</span>
                  <span className="text-white/40 ml-auto">
                    {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `in ${daysAway}d`}
                  </span>
                </div>
              );
            })()}
            {skyEvents[0] && (
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-white">{skyEvents[0].label}</span>
                <span className="text-white/40 ml-auto">{formatTime(skyEvents[0].time, use24h)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
