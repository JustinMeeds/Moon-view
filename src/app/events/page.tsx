"use client";

import React, { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { getLunarDistance } from "@/lib/moon";
import { getSkyEvents } from "@/lib/sun";
import { getUpcomingConjunctions } from "@/lib/planets";
import { LunarDistanceCard } from "@/components/LunarDistanceCard";
import { SkyEventsCard } from "@/components/SkyEventsCard";
import { ConjunctionsCard } from "@/components/ConjunctionsCard";
import { PlanMyShot } from "@/components/PlanMyShot";
import { NoLocation } from "@/components/NoLocation";

export default function EventsPage() {
  const { location, preferences } = useApp();
  const { use24h, nightMode } = preferences;

  const now = useMemo(() => new Date(), []);

  const lunarDistance = useMemo(
    () => (location ? getLunarDistance(now, location) : null),
    [location, now]
  );

  const skyEvents = useMemo(
    () => (location ? getSkyEvents(now, location) : []),
    [location, now]
  );

  const conjunctions = useMemo(
    () => (location ? getUpcomingConjunctions(now, 60, location) : []),
    [location, now]
  );

  if (!location) return <NoLocation />;

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Sky Events</h1>
        <p className="text-xs text-white/40 mt-0.5">Conjunctions, overlaps &amp; planning tools</p>
      </div>

      {/* Upcoming conjunctions — the headline feature */}
      <ConjunctionsCard
        conjunctions={conjunctions}
        use24h={use24h}
        nightMode={nightMode}
        withinDays={60}
      />

      {/* Today's sun–moon overlaps */}
      <SkyEventsCard events={skyEvents} use24h={use24h} nightMode={nightMode} />

      {/* Plan My Shot — azimuth finder */}
      <PlanMyShot location={location} use24h={use24h} nightMode={nightMode} />

      {/* Lunar distance */}
      {lunarDistance && (
        <LunarDistanceCard data={lunarDistance} nightMode={nightMode} />
      )}
    </div>
  );
}
