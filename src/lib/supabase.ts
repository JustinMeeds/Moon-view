import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Singleton client for client-side usage — null if env vars are not set
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

export type AppPreferences = {
  use24h: boolean;
  useCardinal: boolean;
  nightMode: boolean;
  defaultLocationId: string | null;
  units: "metric" | "imperial";
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  use24h: false,
  useCardinal: true,
  nightMode: false,
  defaultLocationId: null,
  units: "metric",
};

export type SavedLocation = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};
