"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { FMZBanner } from "@/components/FMZBanner";
import { FMZMapPicker } from "@/components/FMZMapPicker";
import { SeasonBadge } from "@/components/SeasonBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { RegulationsData, SpeciesRegulation } from "@/lib/regulations";
import {
  getRegulationForZone,
  getSeasonStatus,
  formatSeasonDates,
  formatSizeLimit,
  formatPossessionLimit,
} from "@/lib/regulations";
import { fmzName, fmzLabel } from "@/lib/fmz";

const REGULATIONS_PATH = "/data/regulations-2025.json";

export default function SpeciesRegulationPage({
  params,
}: {
  params: { species: string };
}) {
  const { fmz, fmzSource, setFmz } = useApp();
  const [regs, setRegs] = useState<RegulationsData | null>(null);
  const [fmzPickerOpen, setFmzPickerOpen] = useState(false);

  const now = new Date();

  useEffect(() => {
    fetch(REGULATIONS_PATH)
      .then((r) => r.json())
      .then(setRegs)
      .catch(() => {});
  }, []);

  const species: SpeciesRegulation | null =
    regs?.species.find((s) => s.id === params.species) ?? null;

  if (!regs) {
    return (
      <div className="px-4 pt-3 space-y-3">
        <div className="h-8 bg-white/5 rounded animate-pulse" />
        <div className="h-40 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (!species) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-white/50">Species not found.</p>
        <Link href="/regulations" className="text-emerald-400 text-sm mt-2 block">
          ← Back to Regulations
        </Link>
      </div>
    );
  }

  const reg = fmz ? getRegulationForZone(species, fmz) : { ...species.default, hasOverride: false, overrideNotes: null };
  const status = getSeasonStatus(reg, now);

  return (
    <div className="px-4 pt-3 space-y-3">
      {/* Back nav */}
      <Link href="/regulations" className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Regulations
      </Link>

      {/* FMZ Banner */}
      <FMZBanner
        fmz={fmz}
        source={fmzSource}
        onChangeZone={() => setFmzPickerOpen(true)}
      />

      {/* Species header */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-white">{species.common_name}</h1>
            <SeasonBadge status={status} />
          </div>
          <p className="text-xs text-white/40 italic">{species.scientific_name}</p>
          {fmz && <p className="text-xs text-white/40 mt-0.5">{fmzName(fmz)} · {fmzLabel(fmz)}</p>}
        </div>
      </div>

      {/* FMZ override warning */}
      {reg.hasOverride && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">FMZ override applies</p>
            {reg.overrideNotes && <p className="text-white/60 mt-0.5">{reg.overrideNotes}</p>}
          </div>
        </div>
      )}

      {/* Main regulation card */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Seasons */}
          {reg.seasons.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-white/60">
                {s.type === "open" ? "Open season" : s.type === "catch_and_release" ? "Catch & release" : "Closed"}
              </span>
              <span className="text-white/90 font-medium">{formatSeasonDates(s)}</span>
            </div>
          ))}

          <div className="border-t border-white/8 my-1" />

          {/* Limits */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Size limit</span>
            <span className="text-white/90 font-medium">{formatSizeLimit(reg)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Daily limit</span>
            <span className="text-white/90 font-medium">{reg.daily_limit ?? "No limit"} fish</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Possession limit</span>
            <span className="text-white/90 font-medium">{formatPossessionLimit(reg)}</span>
          </div>

          {/* Notes */}
          {reg.notes && (
            <>
              <div className="border-t border-white/8 my-1" />
              <p className="text-xs text-white/50 leading-relaxed">ℹ️ {reg.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Non-override zones note */}
      {!reg.hasOverride && (
        <p className="text-xs text-white/35 px-1">
          ℹ️ General Ontario rule applies. No {fmz ? `FMZ ${fmz}` : "zone"} exception for this species.
        </p>
      )}

      {/* FMZ comparison note */}
      {fmz && (
        <button
          onClick={() => setFmzPickerOpen(true)}
          className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors text-left"
        >
          Based on FMZ {fmz} — tap to compare another zone
        </button>
      )}

      {/* Link to species info */}
      <Link
        href={`/species/${species.id}`}
        className="flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
      >
        View species info, habitat &amp; techniques →
      </Link>

      {/* Footer disclaimer */}
      <div className="pt-2 pb-4 space-y-1 text-xs text-white/30">
        <p>📋 Regulations current for {regs.version} season</p>
        <p>⚠️ Always verify with the official Ontario Fishing Regulations before keeping fish.</p>
        <a
          href="https://www.ontario.ca/page/fishing-ontario"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400"
        >
          <ExternalLink className="w-3 h-3" />
          Official Ontario Fishing Regulations
        </a>
      </div>

      <FMZMapPicker
        open={fmzPickerOpen}
        currentFmz={fmz}
        onSelect={(id) => { setFmz(id, "manual"); setFmzPickerOpen(false); }}
        onClose={() => setFmzPickerOpen(false)}
      />
    </div>
  );
}
