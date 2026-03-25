"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface Technique {
  name: string;
  seasons: string[];
  description: string;
  best_conditions: string;
}

interface SpeciesDetail {
  id: string;
  common_name: string;
  scientific_name: string;
  overview: string;
  size_range: string;
  ontario_distribution: string;
  habitat: {
    preferred_structure: string[];
    depth_range_m: [number, number];
    water_temp_preferred_c: [number, number];
    notes: string;
  };
  feeding: { spring: string; summer: string; fall: string; winter: string };
  techniques: Technique[];
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-white/80">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
      </button>
      {open && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  );
}

function currentSeason(): "spring" | "summer" | "fall" | "winter" {
  const m = new Date().getMonth(); // 0-indexed
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "fall";
  return "winter";
}

export default function SpeciesDetailPage({ params }: { params: { id: string } }) {
  const { weatherData } = useApp();
  const [species, setSpecies] = useState<SpeciesDetail | null>(null);

  useEffect(() => {
    fetch("/data/species.json")
      .then((r) => r.json())
      .then((all: SpeciesDetail[]) => {
        setSpecies(all.find((s) => s.id === params.id) ?? null);
      })
      .catch(() => {});
  }, [params.id]);

  if (!species) {
    return (
      <div className="px-4 pt-3 space-y-3">
        <div className="h-8 bg-white/5 rounded animate-pulse" />
        <div className="h-40 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  const season = currentSeason();
  const waterTempC = weatherData ? weatherData.current.airTempC * 0.85 : null; // rough estimate
  const [optLow, optHigh] = species.habitat.water_temp_preferred_c;

  const relevantTechniques = species.techniques.filter((t) => t.seasons.includes(season));

  return (
    <div className="px-4 pt-3 space-y-3 pb-6">
      {/* Back */}
      <Link href="/species" className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Species
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">{species.common_name}</h1>
        <p className="text-xs italic text-white/35">{species.scientific_name}</p>
      </div>

      {/* Overview */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm text-white/70 leading-relaxed">{species.overview}</p>
          <p className="text-xs text-white/45">
            <span className="font-medium text-white/60">Size:</span> {species.size_range}
          </p>
          <p className="text-xs text-white/45">
            <span className="font-medium text-white/60">Distribution:</span> {species.ontario_distribution}
          </p>
        </CardContent>
      </Card>

      {/* Habitat */}
      <Collapsible title="Habitat &amp; Behaviour">
        <div className="space-y-2 text-xs text-white/60">
          <div>
            <span className="font-medium text-white/70">Preferred structure:</span>{" "}
            {species.habitat.preferred_structure.join(", ")}
          </div>
          <div>
            <span className="font-medium text-white/70">Depth range:</span>{" "}
            {species.habitat.depth_range_m[0]}–{species.habitat.depth_range_m[1]} m
          </div>
          <div>
            <span className="font-medium text-white/70">Preferred water temp:</span>{" "}
            {optLow}–{optHigh}°C
            {waterTempC !== null && (
              <span className={`ml-1 ${waterTempC >= optLow && waterTempC <= optHigh ? "text-emerald-400" : "text-amber-400"}`}>
                (current ~{waterTempC.toFixed(0)}°C)
              </span>
            )}
          </div>
          <p className="leading-relaxed">{species.habitat.notes}</p>
        </div>
      </Collapsible>

      {/* Seasonal feeding */}
      <Collapsible title="Seasonal Feeding Behaviour">
        <div className="space-y-3">
          {(["spring", "summer", "fall", "winter"] as const).map((s) => (
            <div key={s} className={`text-xs leading-relaxed ${s === season ? "text-white/80" : "text-white/45"}`}>
              <span className={`font-semibold uppercase text-[10px] tracking-wider ${s === season ? "text-emerald-400" : "text-white/30"}`}>
                {s === season ? `▶ ${s}` : s}
              </span>
              {s === season && waterTempC !== null && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  waterTempC >= optLow && waterTempC <= optHigh
                    ? "bg-emerald-500/20 text-emerald-400"
                    : waterTempC < optLow
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}>
                  {waterTempC >= optLow && waterTempC <= optHigh
                    ? `~${waterTempC.toFixed(0)}°C — optimal range`
                    : waterTempC < optLow
                    ? `~${waterTempC.toFixed(0)}°C — below optimal, fish deeper & slower`
                    : `~${waterTempC.toFixed(0)}°C — above optimal, fish seek cooler depth`}
                </span>
              )}
              <p className="mt-0.5">{species.feeding[s]}</p>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Techniques */}
      <Collapsible title={`Best Techniques${relevantTechniques.length ? ` (${season})` : ""}`}>
        <div className="space-y-4">
          {(relevantTechniques.length > 0 ? relevantTechniques : species.techniques).map((t) => (
            <div key={t.name} className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white/80">{t.name}</p>
                {t.seasons.includes(season) && (
                  <span className="text-[9px] text-emerald-400 border border-emerald-500/30 rounded px-1">now</span>
                )}
              </div>
              <p className="text-xs text-white/55 leading-relaxed">{t.description}</p>
              <p className="text-xs text-white/35">Best: {t.best_conditions}</p>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Link to regulations */}
      <Link
        href={`/regulations/${species.id}`}
        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors"
      >
        <span className="text-sm text-white/70">View regulations for {species.common_name}</span>
        <span className="text-white/30">›</span>
      </Link>
    </div>
  );
}
