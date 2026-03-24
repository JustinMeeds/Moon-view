"use client";

import React, { useEffect, useState } from "react";
import { getMoonTimes, Location } from "@/lib/moon";
import { formatDuration, formatTime } from "@/lib/utils";
import { Sunrise, Sunset } from "lucide-react";

interface CountdownProps {
  location: Location;
  use24h: boolean;
}

interface MoonEvent {
  type: "rise" | "set";
  time: Date;
}

function getUpcomingEvents(now: Date, location: Location): MoonEvent[] {
  const events: MoonEvent[] = [];

  // Check today and tomorrow to ensure we always have upcoming events
  for (let dayDelta = 0; dayDelta <= 1; dayDelta++) {
    const d = new Date(now);
    d.setDate(d.getDate() + dayDelta);
    const times = getMoonTimes(d, location);
    if (times.rise && times.rise > now) events.push({ type: "rise", time: times.rise });
    if (times.set  && times.set  > now) events.push({ type: "set",  time: times.set });
  }

  return events
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, 2);
}

export function Countdown({ location, use24h }: CountdownProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);

  const events = getUpcomingEvents(now, location);
  if (events.length === 0) return null;

  return (
    <div className="flex gap-3">
      {events.map((ev, i) => {
        const msUntil = ev.time.getTime() - now.getTime();
        const isImminent = msUntil < 30 * 60_000; // < 30 min
        const Icon = ev.type === "rise" ? Sunrise : Sunset;

        return (
          <div
            key={i}
            className="flex-1 flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5"
          >
            <Icon className={`w-4 h-4 shrink-0 ${isImminent ? "text-amber-400" : "text-white/40"}`} />
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 uppercase tracking-widest leading-none mb-0.5">
                {ev.type === "rise" ? "Moonrise" : "Moonset"}
              </p>
              <p className={`text-sm font-bold leading-tight ${isImminent ? "text-amber-400" : "text-white"}`}>
                {formatDuration(msUntil)}
              </p>
              <p className="text-[10px] text-white/30 leading-none mt-0.5">
                {formatTime(ev.time, use24h)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
