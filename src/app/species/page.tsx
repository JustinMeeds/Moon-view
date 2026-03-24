"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";

interface SpeciesEntry {
  id: string;
  common_name: string;
  scientific_name: string;
  overview: string;
  habitat: { preferred_structure: string[]; water_temp_preferred_c: [number, number] };
}

export default function SpeciesPage() {
  const [species, setSpecies] = useState<SpeciesEntry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/data/species.json")
      .then((r) => r.json())
      .then(setSpecies)
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return species;
    const q = search.toLowerCase();
    return species.filter(
      (s) =>
        s.common_name.toLowerCase().includes(q) ||
        s.scientific_name.toLowerCase().includes(q) ||
        s.overview.toLowerCase().includes(q)
    );
  }, [species, search]);

  return (
    <div className="px-4 pt-3 space-y-3">
      <h1 className="text-base font-semibold text-white">Species</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <Input
          placeholder="Search species…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      <div className="space-y-2 pb-4">
        {filtered.length > 0
          ? filtered.map((s) => (
              <Link key={s.id} href={`/species/${s.id}`} className="block">
                <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white/90">{s.common_name}</p>
                    <span className="text-xs text-white/30">
                      {s.habitat.water_temp_preferred_c[0]}–{s.habitat.water_temp_preferred_c[1]}°C
                    </span>
                  </div>
                  <p className="text-xs italic text-white/35 mt-0.5">{s.scientific_name}</p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed line-clamp-2">{s.overview}</p>
                </div>
              </Link>
            ))
          : species.length === 0
          ? [1,2,3,4,5].map((i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)
          : <p className="text-sm text-white/40 text-center py-4">No species match &quot;{search}&quot;</p>
        }
      </div>
    </div>
  );
}
