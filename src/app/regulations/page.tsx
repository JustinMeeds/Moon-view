"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { FMZBanner } from "@/components/FMZBanner";
import { FMZMapPicker } from "@/components/FMZMapPicker";
import { SeasonBadge } from "@/components/SeasonBadge";
import { SpecialWaterWarning } from "@/components/SpecialWaterWarning";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import type { RegulationsData, SpeciesRegulation, SpecialWater } from "@/lib/regulations";
import { getRegulationForZone, getSeasonStatus, getNearbySpecialWaters, formatSeasonDates, formatSizeLimit, formatPossessionLimit } from "@/lib/regulations";
import { setRegulationsCache, getRegulationsCache, setRegulationsVersion, getRegulationsVersion } from "@/lib/offline";

const REGULATIONS_PATH = "/data/regulations-2025.json";

export default function RegulationsPage() {
  const { location, fmz, fmzSource, setFmz } = useApp();
  const [regs, setRegs] = useState<RegulationsData | null>(null);
  const [fmzPickerOpen, setFmzPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"zone" | "species">("zone");

  const now = new Date();

  // Load regulations on mount
  useEffect(() => {
    async function load() {
      // Try local cache first
      const cached = await getRegulationsCache();
      if (cached) setRegs(cached);

      // Check bundled (always fetch on mount to ensure freshness)
      try {
        const res = await fetch(REGULATIONS_PATH);
        if (!res.ok) return;
        const data: RegulationsData = await res.json();
        setRegs(data);
        setRegulationsCache(data);
        setRegulationsVersion(data.version);
      } catch {}

      // Background: check remote Supabase Storage for a newer version
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return;
      const remoteUrl = `${supabaseUrl}/storage/v1/object/public/data/regulations.json`;
      try {
        const remoteRes = await fetch(remoteUrl);
        if (!remoteRes.ok) return;
        const remoteData: RegulationsData = await remoteRes.json();
        const cachedVersion = await getRegulationsVersion();
        if (remoteData.version !== cachedVersion) {
          setRegs(remoteData);
          setRegulationsCache(remoteData);
          setRegulationsVersion(remoteData.version);
        }
      } catch {}
    }
    load();
  }, []);

  // Nearby special waters
  const nearbyWaters = useMemo((): SpecialWater[] => {
    if (!location || !fmz || !regs) return [];
    return getNearbySpecialWaters(location.lat, location.lng, fmz, regs.special_waters);
  }, [location, fmz, regs]);

  // Filtered species list
  const filteredSpecies = useMemo(() => {
    if (!regs) return [];
    if (!search.trim()) return regs.species;
    const q = search.toLowerCase();
    return regs.species.filter(
      (s) =>
        s.common_name.toLowerCase().includes(q) ||
        s.scientific_name.toLowerCase().includes(q)
    );
  }, [regs, search]);

  return (
    <div className="px-4 pt-3 space-y-3">
      {/* FMZ Banner */}
      <FMZBanner
        fmz={fmz}
        source={fmzSource}
        onChangeZone={() => setFmzPickerOpen(true)}
      />

      {/* Special waters warning */}
      {nearbyWaters.map((w) => (
        <SpecialWaterWarning key={w.id} water={w} />
      ))}

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("zone")}
          className={`py-3 rounded-xl text-sm font-medium transition-colors border ${
            mode === "zone"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/50"
          }`}
        >
          <p className="text-lg mb-0.5">📍</p>
          <p>My Zone</p>
          <p className="text-xs opacity-60">{fmz ? `FMZ ${fmz}` : "Set zone"} · What can I fish?</p>
        </button>
        <button
          onClick={() => setMode("species")}
          className={`py-3 rounded-xl text-sm font-medium transition-colors border ${
            mode === "species"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-white/5 border-white/10 text-white/50"
          }`}
        >
          <p className="text-lg mb-0.5">🐟</p>
          <p>Find Species</p>
          <p className="text-xs opacity-60">Bass, Walleye… · Can I keep this?</p>
        </button>
      </div>

      {/* Search */}
      {mode === "species" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            placeholder="Search species…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Species list */}
      {regs && (
        <div className="space-y-2">
          {filteredSpecies.map((species) => (
            <SpeciesRegCard
              key={species.id}
              species={species}
              fmzId={fmz}
              now={now}
            />
          ))}
        </div>
      )}

      {!regs && (
        <div className="space-y-2">
          {[1,2,3,4].map((i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 pb-4 space-y-1 text-xs text-white/30">
        <p>📋 Regulations current for 2025–2026 season{regs ? ` · Last verified ${regs.last_verified_by_human}` : ""}</p>
        <p>⚠️ Always verify with the official Ontario Fishing Regulations before keeping fish.</p>
        <a
          href="https://www.ontario.ca/page/fishing-ontario"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Ontario MNR Fishing Regulations
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

function SpeciesRegCard({
  species,
  fmzId,
  now,
}: {
  species: SpeciesRegulation;
  fmzId: number | null;
  now: Date;
}) {
  const mergedReg = fmzId
    ? getRegulationForZone(species, fmzId)
    : { ...species.default, hasOverride: false, overrideNotes: null };
  const reg = mergedReg;
  const status = getSeasonStatus(mergedReg, now);
  const openSeason = reg.seasons.find((s) => s.type === "open");
  const crSeason = reg.seasons.find((s) => s.type === "catch_and_release");

  return (
    <Link href={`/regulations/${species.id}`} className="block">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white/90">{species.common_name}</span>
            <SeasonBadge status={status} />
            {reg.hasOverride && (
              <span className="text-[10px] text-amber-400 border border-amber-500/30 rounded px-1">FMZ override</span>
            )}
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {openSeason ? formatSeasonDates(openSeason) : crSeason ? `C&R: ${formatSeasonDates(crSeason)}` : "Closed"}
            {" · "}
            {formatSizeLimit(reg)}
          </p>
        </div>
        <span className="text-white/30 text-sm shrink-0">›</span>
      </div>
    </Link>
  );
}
