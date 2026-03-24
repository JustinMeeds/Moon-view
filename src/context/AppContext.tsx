"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { Location } from "@/lib/moon";
import { AppPreferences, DEFAULT_PREFERENCES, getSupabaseClient } from "@/lib/supabase";
import type { WeatherData } from "@/lib/weather";
import { fetchWeather, getStaleCachedWeather } from "@/lib/weather";
import { detectFmz } from "@/lib/fmz";
import { setFmzCache, getFmzCache } from "@/lib/offline";

export type FmzSource = "gps" | "manual" | "stale";

interface AppContextValue {
  location: Location | null;
  locationLoading: boolean;
  locationError: string | null;
  requestLocation: () => void;
  setManualLocation: (loc: Location) => void;

  // FMZ state
  fmz: number | null;
  fmzSource: FmzSource | null;
  setFmz: (id: number, source: "gps" | "manual") => void;

  // Weather
  weatherData: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  weatherStaleMs: number | null; // ms since last fetch, null if fresh
  refreshWeather: () => Promise<void>;

  preferences: AppPreferences;
  setPreferences: (prefs: Partial<AppPreferences>) => void;

  // Shared day offset: 0=today, -1=yesterday, +1=tomorrow, etc.
  dayOffset: number;
  setDayOffset: (offset: number) => void;

  // Auth (not used in v1 but wired for v2)
  user: { id: string; email?: string } | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const LOCATION_KEY = "caston_location";
const PREFS_KEY    = "caston_prefs";
const FMZ_KEY      = "caston_fmz";

const WEATHER_STALE_MS = 30 * 60 * 1000;  // 30 min

export function AppProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [fmz, setFmzState] = useState<number | null>(null);
  const [fmzSource, setFmzSource] = useState<FmzSource | null>(null);

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherStaleMs, setWeatherStaleMs] = useState<number | null>(null);

  const [preferences, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [dayOffset, setDayOffsetState] = useState(() => {
    try {
      const v = sessionStorage.getItem("caston_day_offset");
      return v ? parseInt(v, 10) : 0;
    } catch { return 0; }
  });
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  const setDayOffset = useCallback((offset: number) => {
    setDayOffsetState(offset);
    try { sessionStorage.setItem("caston_day_offset", String(offset)); } catch {}
  }, []);

  // ── Restore persisted state on mount ────────────────────────────────────────
  useEffect(() => {
    try {
      const storedLoc = localStorage.getItem(LOCATION_KEY);
      if (storedLoc) setLocation(JSON.parse(storedLoc));

      const storedPrefs = localStorage.getItem(PREFS_KEY);
      if (storedPrefs) setPrefs({ ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) });

      const storedFmz = localStorage.getItem(FMZ_KEY);
      if (storedFmz) {
        const parsed = JSON.parse(storedFmz);
        setFmzState(parsed.id);
        // Mark as stale if detected > 2h ago
        const ageMs = Date.now() - (parsed.detectedAt ?? 0);
        setFmzSource(ageMs > 2 * 60 * 60 * 1000 ? "stale" : parsed.source);
      }
    } catch {}
  }, []);

  // ── Load stale weather cache on mount ───────────────────────────────────────
  useEffect(() => {
    getStaleCachedWeather().then((cached) => {
      if (cached) {
        setWeatherData(cached);
        const ageMs = Date.now() - cached.fetchedAt;
        setWeatherStaleMs(ageMs > WEATHER_STALE_MS ? ageMs : null);
      }
    });
  }, []);

  // ── Auto-detect FMZ when location is set ────────────────────────────────────
  useEffect(() => {
    if (!location || fmz !== null) return;
    detectFmz(location.lat, location.lng).then((id) => {
      if (id !== null) {
        setFmzState(id);
        setFmzSource("gps");
        const entry = {
          fmz: id,
          lat: location.lat,
          lon: location.lng,
          detectedAt: Date.now(),
          source: "gps" as const,
        };
        setFmzCache(entry).catch(() => {});
        try {
          localStorage.setItem(FMZ_KEY, JSON.stringify({ id, detectedAt: Date.now(), source: "gps" }));
        } catch {}
      }
    }).catch(() => {});
  }, [location, fmz]);

  // ── Auth state ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;

    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({ id: data.session.user.id, email: data.session.user.email ?? undefined });
      }
    });

    const { data: sub } = sb.auth.onAuthStateChange((_ev, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? undefined });
      } else {
        setUser(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // ── Location actions ─────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: Location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Current Location",
        };
        setLocation(loc);
        setLocationLoading(false);
        try { localStorage.setItem(LOCATION_KEY, JSON.stringify(loc)); } catch {}
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Location access denied. Please enter your location manually."
            : "Unable to get location. Please enter it manually."
        );
        setLocationLoading(false);
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const setManualLocation = useCallback((loc: Location) => {
    setLocation(loc);
    setLocationError(null);
    try { localStorage.setItem(LOCATION_KEY, JSON.stringify(loc)); } catch {}
  }, []);

  // ── FMZ actions ──────────────────────────────────────────────────────────────
  const setFmz = useCallback((id: number, source: "gps" | "manual") => {
    setFmzState(id);
    setFmzSource(source);
    const entry = { id, detectedAt: Date.now(), source };
    try { localStorage.setItem(FMZ_KEY, JSON.stringify(entry)); } catch {}
    getFmzCache().then((cached) => {
      setFmzCache({
        fmz: id,
        lat: cached?.lat ?? 0,
        lon: cached?.lon ?? 0,
        detectedAt: Date.now(),
        source,
      }).catch(() => {});
    });
  }, []);

  // ── Weather actions ──────────────────────────────────────────────────────────
  const refreshWeather = useCallback(async () => {
    if (!location) return;
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const data = await fetchWeather(location.lat, location.lng);
      setWeatherData(data);
      setWeatherStaleMs(null);
    } catch (e) {
      setWeatherError(e instanceof Error ? e.message : "Weather unavailable");
      // Keep stale data visible
    } finally {
      setWeatherLoading(false);
    }
  }, [location]);

  // Auto-refresh weather on location change
  useEffect(() => {
    if (location) refreshWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.lat, location?.lng]);

  // ── Preferences ──────────────────────────────────────────────────────────────
  const setPreferences = useCallback((partial: Partial<AppPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ── Auth actions (v1: not used) ──────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    const sb = getSupabaseClient();
    if (!sb) return "Supabase not configured";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        location,
        locationLoading,
        locationError,
        requestLocation,
        setManualLocation,
        fmz,
        fmzSource,
        setFmz,
        weatherData,
        weatherLoading,
        weatherError,
        weatherStaleMs,
        refreshWeather,
        preferences,
        setPreferences,
        dayOffset,
        setDayOffset,
        user,
        signIn,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
