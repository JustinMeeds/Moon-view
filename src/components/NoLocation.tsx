"use client";

import React, { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

async function geocode(query: string) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
    { headers: { "Accept-Language": "en" } }
  );
  const data = await res.json();
  if (!data.length) return null;
  const r = data[0];
  return {
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    label: r.display_name.split(",").slice(0, 2).join(", "),
  };
}

export function NoLocation() {
  const { requestLocation, setManualLocation, locationError, locationLoading } = useApp();
  const [query, setQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setGeocoding(true);
    setError(null);
    try {
      const r = await geocode(query);
      if (r) setManualLocation(r);
      else setError("Location not found. Try a different name.");
    } catch {
      setError("Geocoding failed. Check your connection.");
    }
    setGeocoding(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6 text-center">
      <div className="text-6xl">🌙</div>
      <div>
        <h2 className="text-xl font-bold text-white mb-2">Where are you?</h2>
        <p className="text-sm text-white/50">
          Moon Tracker needs your location to calculate positions.
        </p>
      </div>

      <Button onClick={requestLocation} disabled={locationLoading} size="lg" className="w-full max-w-xs">
        <Navigation className="w-5 h-5" />
        {locationLoading ? "Getting location…" : "Use My Location"}
      </Button>

      {locationError && (
        <p className="text-xs text-red-400 max-w-xs">{locationError}</p>
      )}

      <div className="w-full max-w-xs">
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-white/30">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 mt-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter city or address…"
            disabled={geocoding}
          />
          <Button type="submit" disabled={geocoding || !query.trim()}>
            {geocoding ? "…" : <MapPin className="w-4 h-4" />}
          </Button>
        </form>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>
    </div>
  );
}
