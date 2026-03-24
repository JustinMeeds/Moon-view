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

interface AppContextValue {
  location: Location | null;
  locationLoading: boolean;
  locationError: string | null;
  requestLocation: () => void;
  setManualLocation: (loc: Location) => void;
  preferences: AppPreferences;
  setPreferences: (prefs: Partial<AppPreferences>) => void;
  // Shared day offset: 0=today, -1=yesterday, +1=tomorrow, etc.
  dayOffset: number;
  setDayOffset: (offset: number) => void;
  user: { id: string; email?: string } | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const LOCATION_KEY = "moon_location";
const PREFS_KEY = "moon_prefs";

export function AppProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [preferences, setPrefs] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [dayOffset, setDayOffsetState] = useState(() => {
    try {
      const v = sessionStorage.getItem("moon_day_offset");
      return v ? parseInt(v, 10) : 0;
    } catch { return 0; }
  });

  const setDayOffset = useCallback((offset: number) => {
    setDayOffsetState(offset);
    try { sessionStorage.setItem("moon_day_offset", String(offset)); } catch {}
  }, []);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Restore persisted location + prefs on mount
  useEffect(() => {
    try {
      const storedLoc = localStorage.getItem(LOCATION_KEY);
      if (storedLoc) setLocation(JSON.parse(storedLoc));

      const storedPrefs = localStorage.getItem(PREFS_KEY);
      if (storedPrefs) setPrefs({ ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) });
    } catch {}
  }, []);

  // Auth state
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

  const setPreferences = useCallback((partial: Partial<AppPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

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
