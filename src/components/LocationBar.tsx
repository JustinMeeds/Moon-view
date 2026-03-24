"use client";

import React, { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

// Simple geocoding via OpenStreetMap Nominatim (no API key needed)
async function geocode(query: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length === 0) return null;
    const r = data[0];
    return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), label: r.display_name.split(",").slice(0, 2).join(", ") };
  } catch {
    return null;
  }
}

export function LocationBar() {
  const { location, locationLoading, locationError, requestLocation, setManualLocation } = useApp();
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const handleGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setGeocoding(true);
    setGeocodeError(null);
    const result = await geocode(query.trim());
    if (result) {
      setManualLocation(result);
      setEditing(false);
      setQuery("");
    } else {
      setGeocodeError("Location not found. Try a city name or coordinates.");
    }
    setGeocoding(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <form onSubmit={handleGeocode} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City name or address…"
            autoFocus
            disabled={geocoding}
          />
          <Button type="submit" size="sm" disabled={geocoding || !query.trim()}>
            {geocoding ? "…" : "Go"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            ✕
          </Button>
        </form>
        {geocodeError && <p className="text-xs text-red-400 px-1">{geocodeError}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="text-sm text-white/70 truncate">
          {locationLoading
            ? "Getting location…"
            : location?.label ?? "No location set"}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={requestLocation}
          title="Use GPS"
          className="w-8 h-8"
        >
          <Navigation className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(true)}
          className="text-xs h-8 px-3"
        >
          Change
        </Button>
      </div>
    </div>
  );
}
