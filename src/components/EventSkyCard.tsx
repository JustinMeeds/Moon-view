"use client";

import React, { useMemo, useState } from "react";
import { Location, buildNightChart, getMoonPosition } from "@/lib/moon";
import {
  PlanetConjunction,
  PLANET_META,
  getSkyBodies,
  bestViewingMoment,
} from "@/lib/planets";
import { SkyEvent } from "@/lib/sun";
import { HorizonPath } from "@/components/HorizonPath";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, formatDateLabel, azimuthToCardinal } from "@/lib/utils";

interface EventSkyCardProps {
  location: Location;
  /** Stable "current time" owned by the page — keeps chip building pure */
  now: Date;
  conjunctions: PlanetConjunction[];
  skyEvents: SkyEvent[];
  nextPerigee?: Date | null;
  use24h: boolean;
  useCardinal?: boolean;
  nightMode?: boolean;
  headingDeg?: number | null;
  compassPrompt?: boolean;
  onEnableCompass?: () => void;
}

interface EventChip {
  id: string;
  icon: string;
  iconClass: string;
  label: string;
  /** Instant the sky view shows — snapped to a viewable moment for conjunctions */
  time: Date;
}

const SKY_EVENT_ICONS: Record<SkyEvent["type"], string> = {
  "moonrise-sunset": "🌕",
  "moonrise-golden": "🌇",
  "moonset-sunrise": "🌅",
  "crescent-twilight": "🌒",
  "moon-daylight": "☀️",
};

export function EventSkyCard({
  location,
  now,
  conjunctions,
  skyEvents,
  nextPerigee,
  use24h,
  useCardinal = true,
  nightMode = false,
  headingDeg,
  compassPrompt = false,
  onEnableCompass,
}: EventSkyCardProps) {
  const chips = useMemo<EventChip[]>(() => {
    const nowMs = now.getTime();
    const list: EventChip[] = [
      { id: "now", icon: "◉", iconClass: "text-indigo-300", label: "Now", time: now },
    ];

    for (const e of skyEvents) {
      if (e.time.getTime() < nowMs - 3_600_000) continue;
      list.push({
        id: `sky-${e.type}`,
        icon: SKY_EVENT_ICONS[e.type],
        iconClass: "",
        label: `${e.label} · ${formatTime(e.time, use24h)}`,
        time: e.time,
      });
    }

    for (const c of conjunctions.slice(0, 5)) {
      const daysAway = Math.round((c.date.getTime() - nowMs) / 86_400_000);
      const when =
        daysAway <= 0 ? "Today" : daysAway === 1 ? "Tomorrow" : formatDateLabel(c.date);
      list.push({
        id: `conj-${c.planet}-${c.date.getTime()}`,
        icon: PLANET_META[c.planet].symbol,
        iconClass: PLANET_META[c.planet].color,
        label: `Moon × ${c.planet} · ${when}`,
        time: bestViewingMoment(c.date, location),
      });
    }

    if (nextPerigee) {
      list.push({
        id: "perigee",
        icon: "●",
        iconClass: "text-indigo-200",
        label: `Perigee · ${formatDateLabel(nextPerigee)}`,
        time: nextPerigee,
      });
    }

    return list.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [now, conjunctions, skyEvents, nextPerigee, location, use24h]);

  const [selectedId, setSelectedId] = useState("now");
  const selected = chips.find((c) => c.id === selectedId) ?? chips[0];

  // Sky state at the selected instant
  const view = useMemo(() => {
    const t = selected.time;
    const summary = buildNightChart(t, location);
    const bodies = getSkyBodies(t, location);
    const moonPos = getMoonPosition(t, location);
    const riseAz = summary.moonrise
      ? getMoonPosition(summary.moonrise, location).azimuthDeg
      : null;
    const setAz = summary.moonset
      ? getMoonPosition(summary.moonset, location).azimuthDeg
      : null;
    // Frame the moon if it's up at the event; otherwise fall back to auto framing
    const center = moonPos.altitudeDeg > -10 ? moonPos.azimuthDeg : undefined;
    return { summary, bodies, moonPos, riseAz, setAz, center };
  }, [selected.time, location]);

  const isNow = selected.id === "now";

  return (
    <Card>
      <CardHeader><CardTitle>Event Sky</CardTitle></CardHeader>
      <CardContent>
        {/* Event chips — each retimes the view below */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((c) => {
            const active = c.id === selected.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`shrink-0 flex items-center gap-1.5 text-[11px] rounded-full px-3 py-1.5 border transition-colors ${
                  active
                    ? nightMode
                      ? "border-red-700/60 bg-red-950/40 text-red-400"
                      : "border-amber-300/50 bg-amber-300/10 text-amber-200"
                    : nightMode
                      ? "border-red-900/30 text-red-800 hover:border-red-800/50"
                      : "border-white/10 text-white/50 hover:border-white/25"
                }`}
              >
                <span className={c.iconClass}>{c.icon}</span>
                {c.label}
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-white/40 mt-1 mb-2 text-center">
          {isNow ? "The sky right now" : `${formatDateLabel(selected.time)} · ${formatTime(selected.time, use24h)}`}
          {" · moon "}
          {view.moonPos.altitudeDeg > 0
            ? `${Math.round(view.moonPos.altitudeDeg)}° up, ${azimuthToCardinal(view.moonPos.azimuthDeg)}`
            : "below horizon"}
        </p>

        <HorizonPath
          key={selected.id}
          data={view.summary.chartPoints}
          highlightTime={selected.time}
          moonrise={view.summary.moonrise}
          moonset={view.summary.moonset}
          riseAzimuthDeg={view.riseAz}
          setAzimuthDeg={view.setAz}
          peak={view.summary.peak}
          use24h={use24h}
          useCardinal={useCardinal}
          nightMode={nightMode}
          headingDeg={headingDeg}
          bodies={view.bodies}
          defaultCenterDeg={view.center}
        />

        {compassPrompt && onEnableCompass && (
          <p className="text-center mt-2">
            <button
              onClick={onEnableCompass}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors underline underline-offset-2"
            >
              Enable live compass to scan the sky
            </button>
          </p>
        )}
        <p className="text-[10px] text-white/30 text-center mt-1">
          Tap an event to see where it happens — planets sized by real brightness
        </p>
      </CardContent>
    </Card>
  );
}
