"use client";

import React from "react";
import { LunarDistance } from "@/lib/moon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateLabel } from "@/lib/utils";

interface LunarDistanceCardProps {
  data: LunarDistance;
  nightMode?: boolean;
}

const MOON_MIN_KM = 356_500;
const MOON_MAX_KM = 406_700;

function formatKm(km: number): string {
  return km.toLocaleString() + " km";
}

export function LunarDistanceCard({ data, nightMode = false }: LunarDistanceCardProps) {
  const { distanceKm, percentClose, isSupermoon, nextPerigee, nextPerigeeKm } = data;

  const barColor = nightMode
    ? percentClose > 80 ? "bg-red-500" : "bg-red-900/60"
    : percentClose > 80 ? "bg-amber-400" : "bg-indigo-500/60";

  const daysToPerigee = nextPerigee
    ? Math.round((nextPerigee.getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Lunar Distance</CardTitle>
        {isSupermoon && <Badge variant="warning">Supermoon</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-2xl font-bold text-white">{formatKm(distanceKm)}</span>
          <span className={`text-sm font-medium ${nightMode ? "text-red-400" : "text-indigo-300"}`}>
            {percentClose}% close
          </span>
        </div>

        {/* Distance gauge: left = apogee (far), right = perigee (close) */}
        <div className="space-y-1">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${percentClose}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30">
            <span>Apogee {MOON_MAX_KM.toLocaleString()} km</span>
            <span>Perigee {MOON_MIN_KM.toLocaleString()} km</span>
          </div>
        </div>

        {nextPerigee && daysToPerigee !== null && (
          <div className="flex items-center justify-between text-sm border-t border-white/5 pt-2">
            <span className="text-white/50">Next closest approach</span>
            <div className="text-right">
              <p className="text-white font-medium">
                {daysToPerigee === 0 ? "Today" : daysToPerigee === 1 ? "Tomorrow" : `in ${daysToPerigee} days`}
              </p>
              <p className="text-[10px] text-white/30">
                {formatDateLabel(nextPerigee)}{nextPerigeeKm ? ` · ${nextPerigeeKm.toLocaleString()} km` : ""}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
