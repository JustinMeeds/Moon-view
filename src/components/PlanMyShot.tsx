"use client";

import React, { useState, useCallback } from "react";
import { findDatesForAzimuth, AzimuthMatch } from "@/lib/moon";
import { Location } from "@/lib/moon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { azimuthToCardinal, formatTime, formatDateLabel } from "@/lib/utils";
import { Sunrise, Sunset } from "lucide-react";

interface PlanMyShotProps {
  location: Location;
  use24h: boolean;
  nightMode?: boolean;
}

export function PlanMyShot({ location, use24h, nightMode = false }: PlanMyShotProps) {
  const [targetAz, setTargetAz] = useState<string>("90");
  const [results, setResults] = useState<AzimuthMatch[] | null>(null);
  const [searching, setSearching] = useState(false);

  const azNum = parseFloat(targetAz);
  const validAz = !isNaN(azNum) && azNum >= 0 && azNum <= 360;
  const cardinal = validAz ? azimuthToCardinal(azNum) : "";

  const handleSearch = useCallback(() => {
    if (!validAz) return;
    setSearching(true);
    // Run in a timeout to allow the "Searching…" render to flush
    setTimeout(() => {
      const matches = findDatesForAzimuth(azNum, new Date(), 60, location, 4);
      setResults(matches);
      setSearching(false);
    }, 0);
  }, [azNum, validAz, location]);

  const accentColor = nightMode ? "text-red-400" : "text-indigo-300";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan My Shot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-white/50">
          Enter a compass bearing to find upcoming dates when the moon rises or sets at that azimuth — useful for aligning the moon with a landmark.
        </p>

        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Input
              type="number"
              min={0}
              max={360}
              value={targetAz}
              onChange={(e) => { setTargetAz(e.target.value); setResults(null); }}
              placeholder="0–360"
              className="pr-14"
            />
            {validAz && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold ${accentColor}`}>
                {cardinal}
              </span>
            )}
          </div>
          <Button
            variant="secondary"
            onClick={handleSearch}
            disabled={!validAz || searching}
            className="shrink-0"
          >
            {searching ? "Searching…" : "Find"}
          </Button>
        </div>

        {results !== null && (
          results.length === 0 ? (
            <p className="text-sm text-white/40">
              No moonrises or moonsets within 4° of {azNum.toFixed(0)}° {cardinal} in the next 60 days.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-white/30 uppercase tracking-widest">
                {results.length} match{results.length !== 1 ? "es" : ""} · next 60 days · ±4°
              </p>
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-t border-white/5">
                  <div className={`shrink-0 ${r.type === "rise" ? "text-amber-400" : "text-indigo-400"}`}>
                    {r.type === "rise"
                      ? <Sunrise className="w-4 h-4" />
                      : <Sunset className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      {r.type === "rise" ? "Moonrise" : "Moonset"} — {formatDateLabel(r.time)}
                    </p>
                    <p className="text-xs text-white/40">
                      {formatTime(r.time, use24h)} · {r.azimuthDeg}° ({azimuthToCardinal(r.azimuthDeg)}) · {r.deltaDeg}° off target
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
