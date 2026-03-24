"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { getSupabaseClient, SavedLocation } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Clock,
  Compass,
  Eye,
  EyeOff,
} from "lucide-react";

// Simple toggle component
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm text-white/80">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

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

export default function SettingsPage() {
  const {
    location,
    preferences,
    setPreferences,
    requestLocation,
    setManualLocation,
    user,
    signIn,
    signOut,
  } = useApp();

  // Auth form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Location form
  const [newLocationQuery, setNewLocationQuery] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Saved locations
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

  // Load saved locations from Supabase when user is logged in
  useEffect(() => {
    if (!user) return;
    const sb = getSupabaseClient();
    if (!sb) return;
    sb.from("saved_locations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setSavedLocations(data as SavedLocation[]);
      });
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const sb = getSupabaseClient();
    if (!sb) {
      setAuthError("Supabase is not configured.");
      setAuthLoading(false);
      return;
    }
    if (isSignUp) {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) setAuthError(error.message);
      else setAuthError("Check your email to confirm your account.");
    } else {
      const err = await signIn(email, password);
      if (err) setAuthError(err);
    }
    setAuthLoading(false);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationQuery.trim()) return;
    setAddingLocation(true);
    setLocationError(null);
    const result = await geocode(newLocationQuery.trim());
    if (!result) {
      setLocationError("Location not found.");
      setAddingLocation(false);
      return;
    }
    if (user) {
      const sb = getSupabaseClient();
      if (sb) {
        const { data } = await sb
          .from("saved_locations")
          .insert({ user_id: user.id, label: result.label, lat: result.lat, lng: result.lng })
          .select()
          .single();
        if (data) setSavedLocations((prev) => [...prev, data as SavedLocation]);
      }
    }
    setManualLocation(result);
    setNewLocationQuery("");
    setAddingLocation(false);
  };

  const handleDeleteLocation = async (id: string) => {
    setSavedLocations((prev) => prev.filter((l) => l.id !== id));
    const sb = getSupabaseClient();
    if (sb && user) {
      await sb.from("saved_locations").delete().eq("id", id);
    }
  };

  const handleUseLocation = (loc: SavedLocation) => {
    setManualLocation({ lat: loc.lat, lng: loc.lng, label: loc.label });
  };

  return (
    <div className="px-4 pt-6 space-y-5 pb-8">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      {/* Night mode — big prominent toggle */}
      <button
        onClick={() => setPreferences({ nightMode: !preferences.nightMode })}
        className={`w-full flex items-center gap-4 rounded-2xl px-5 py-4 border transition-colors ${
          preferences.nightMode
            ? "bg-[rgba(100,0,0,0.2)] border-[rgba(200,0,0,0.35)]"
            : "bg-white/5 border-white/10 hover:bg-white/10"
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          preferences.nightMode ? "bg-[rgba(180,0,0,0.25)]" : "bg-white/10"
        }`}>
          {preferences.nightMode
            ? <Eye className="w-5 h-5 text-[#ff3300]" />
            : <EyeOff className="w-5 h-5 text-white/60" />}
        </div>
        <div className="flex-1 text-left">
          <p className={`font-semibold text-sm ${preferences.nightMode ? "text-[#ff3300]" : "text-white"}`}>
            Night Mode {preferences.nightMode ? "On" : "Off"}
          </p>
          <p className="text-xs text-white/40 mt-0.5">
            Black background, red linework — preserves dark adaptation
          </p>
        </div>
        <div className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
          preferences.nightMode ? "bg-[#cc0000]" : "bg-white/20"
        }`}>
          <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
            preferences.nightMode ? "translate-x-6" : "translate-x-0"
          }`} />
        </div>
      </button>

      {/* Display preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            checked={preferences.use24h}
            onChange={(v) => setPreferences({ use24h: v })}
            label="24-hour time"
          />
          <div className="h-px bg-white/5" />
          <Toggle
            checked={preferences.useCardinal}
            onChange={(v) => setPreferences({ useCardinal: v })}
            label="Show cardinal directions (N, NNE…)"
          />
        </CardContent>
      </Card>

      {/* Current location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-white/70 truncate">{location.label}</span>
              <Badge variant="success" className="ml-auto shrink-0">Active</Badge>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={requestLocation}
            className="w-full"
          >
            <Navigation className="w-4 h-4" />
            Use GPS Location
          </Button>

          {/* Add location form */}
          <form onSubmit={handleAddLocation} className="flex gap-2">
            <Input
              value={newLocationQuery}
              onChange={(e) => setNewLocationQuery(e.target.value)}
              placeholder="Add a location…"
              disabled={addingLocation}
            />
            <Button type="submit" size="icon" disabled={addingLocation || !newLocationQuery.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
          {locationError && <p className="text-xs text-red-400">{locationError}</p>}

          {/* Saved locations list */}
          {savedLocations.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Saved</p>
              {savedLocations.map((loc) => (
                <div
                  key={loc.id}
                  className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  <span
                    className="text-sm text-white/80 flex-1 cursor-pointer hover:text-white truncate"
                    onClick={() => handleUseLocation(loc)}
                  >
                    {loc.label}
                  </span>
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="text-white/30 hover:text-red-400 transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center">
                  <span className="text-sm text-indigo-300">
                    {user.email?.[0]?.toUpperCase() ?? "U"}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white">{user.email}</p>
                  <p className="text-xs text-white/40">Signed in</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-white/50">
                Sign in to save your locations and preferences across devices.
              </p>
              {getSupabaseClient() ? (
                <form onSubmit={handleAuth} className="space-y-3">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    autoComplete="email"
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                  />
                  {authError && (
                    <p className={`text-xs ${authError.includes("Check") ? "text-green-400" : "text-red-400"}`}>
                      {authError}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={authLoading}>
                    <LogIn className="w-4 h-4" />
                    {authLoading ? "…" : isSignUp ? "Create Account" : "Sign In"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
                    className="w-full text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    {isSignUp ? "Already have an account? Sign in" : "No account? Create one"}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-amber-400">
                  Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable auth.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/50">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" />
            <span>Moon calculations powered by SunCalc</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>All times shown in your local timezone</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>Geocoding by OpenStreetMap Nominatim</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
