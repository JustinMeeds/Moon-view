"use client";

import React from "react";
import { SkyEvent } from "@/lib/sun";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/lib/utils";
import { Sunrise, Sun, Moon } from "lucide-react";

interface SkyEventsCardProps {
  events: SkyEvent[];
  use24h: boolean;
  nightMode?: boolean;
}

const EVENT_ICONS: Record<SkyEvent["type"], React.ReactNode> = {
  "moonrise-sunset":    <Moon className="w-4 h-4" />,
  "moonrise-golden":    <Sunrise className="w-4 h-4" />,
  "moonset-sunrise":    <Sunrise className="w-4 h-4" />,
  "crescent-twilight":  <Moon className="w-4 h-4" />,
  "moon-daylight":      <Sun className="w-4 h-4" />,
};

export function SkyEventsCard({ events, use24h, nightMode = false }: SkyEventsCardProps) {
  const iconColor = nightMode ? "text-red-400" : "text-amber-400";

  return (
    <Card>
      <CardHeader><CardTitle>Sky Overlaps Today</CardTitle></CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-white/40">No special sun–moon overlaps today</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                  {EVENT_ICONS[ev.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-white leading-tight">{ev.label}</p>
                    <p className="text-[10px] text-white/40 shrink-0">{formatTime(ev.time, use24h)}</p>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">{ev.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
