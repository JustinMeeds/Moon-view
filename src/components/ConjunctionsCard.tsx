"use client";

import React from "react";
import { PlanetConjunction, PLANET_META } from "@/lib/planets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime, formatDateLabel } from "@/lib/utils";

interface ConjunctionsCardProps {
  conjunctions: PlanetConjunction[];
  use24h: boolean;
  nightMode?: boolean;
  /** Limit to conjunctions within this many days from now. Default: show all. */
  withinDays?: number;
}

export function ConjunctionsCard({
  conjunctions,
  use24h,
  nightMode = false,
  withinDays,
}: ConjunctionsCardProps) {
  const now = Date.now();

  const filtered = withinDays
    ? conjunctions.filter((c) => c.date.getTime() - now <= withinDays * 86_400_000)
    : conjunctions;

  return (
    <Card>
      <CardHeader><CardTitle>Moon–Planet Conjunctions</CardTitle></CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-white/40">No close conjunctions in the next {withinDays ?? 60} days</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((c, i) => {
              const meta = PLANET_META[c.planet];
              const daysAway = Math.round((c.date.getTime() - now) / 86_400_000);
              const isTonight = daysAway <= 1;
              return (
                <div key={i} className="flex items-start gap-3">
                  <span className={`text-lg leading-none mt-0.5 ${meta.color}`}>{meta.symbol}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{c.planet}</span>
                      {isTonight && (
                        <Badge variant={c.isNightVisible ? "success" : "muted"} className="text-[9px] py-0">
                          {c.isNightVisible ? "Tonight" : "Daytime"}
                        </Badge>
                      )}
                      {!c.isNightVisible && !isTonight && (
                        <Badge variant="muted" className="text-[9px] py-0">Daytime</Badge>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">
                      {daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : `in ${daysAway} days`}
                      {" · "}{formatDateLabel(c.date)}{" · "}{formatTime(c.date, use24h)}
                    </p>
                    <p className="text-xs text-white/40">
                      {c.separationDeg}° apart · {c.cardinal} sky
                      {c.moonAltitudeDeg > 0 ? ` · ${Math.round(c.moonAltitudeDeg)}° up` : " · below horizon"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
