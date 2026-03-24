/**
 * Water temperature: ECCC Hydrometric API (primary) + air-temp regression fallback.
 *
 * ECCC endpoint may be blocked by CORS in the browser.
 * In that case, calls fall through to /api/watertemp (Next.js proxy route).
 */
import { getWaterTempCache, setWaterTempCache } from "./offline";

const ECCC_BASE = "https://wateroffice.ec.gc.ca/services/real_time_service/csv";
const PROXY_ROUTE = "/api/watertemp";
const STATION_INDEX_PATH = "/data/eccc-stations.json";
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_STATION_DISTANCE_KM = 50;

export interface WaterTempResult {
  tempC: number;
  source: "eccc" | "estimated";
  stationName?: string;
  stationId?: string;
  /** Age of the reading in ms (ECCC only) */
  ageMs?: number;
}

interface EcccStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

// ─── Haversine distance ───────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Station lookup ───────────────────────────────────────────────────────────

let stationCache: EcccStation[] | null = null;

async function loadStations(): Promise<EcccStation[]> {
  if (stationCache) return stationCache;
  const res = await fetch(STATION_INDEX_PATH);
  if (!res.ok) throw new Error("Failed to load ECCC station index");
  stationCache = await res.json();
  return stationCache!;
}

async function findNearestStation(
  lat: number,
  lon: number
): Promise<{ station: EcccStation; distanceKm: number } | null> {
  const stations = await loadStations();
  let best: { station: EcccStation; distanceKm: number } | null = null;

  for (const s of stations) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (!best || d < best.distanceKm) {
      best = { station: s, distanceKm: d };
    }
  }

  if (!best || best.distanceKm > MAX_STATION_DISTANCE_KM) return null;
  return best;
}

// ─── ECCC fetch ───────────────────────────────────────────────────────────────

async function fetchEcccTemp(stationId: string): Promise<{ tempC: number; ageMs: number }> {
  // Try direct first; fall back to proxy on CORS error
  const urls = [
    `${ECCC_BASE}?stations=${stationId}&parameters=5`,
    `${PROXY_ROUTE}?stationId=${stationId}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      // Check if response is from our proxy (JSON) or direct ECCC (CSV)
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        return { tempC: json.tempC, ageMs: json.ageMs };
      }

      // Parse ECCC CSV: Date,Value,...
      const text = await res.text();
      const lines = text.trim().split("\n").filter((l) => !l.startsWith("#") && l.trim());
      if (lines.length < 2) continue;

      const lastLine = lines[lines.length - 1];
      const parts = lastLine.split(",");
      const tempC = parseFloat(parts[1]);
      const readingTime = new Date(parts[0]).getTime();
      if (isNaN(tempC)) continue;

      return { tempC, ageMs: Date.now() - readingTime };
    } catch {
      // Continue to next URL
    }
  }

  throw new Error("ECCC water temp unavailable");
}

// ─── Estimation fallback ─────────────────────────────────────────────────────

/**
 * Simple seasonal air→water temp regression.
 * Water lags air by ~2 weeks in spring/fall, tracks more closely in summer.
 * Bounded to [0, 30] (ice-covered in winter, never tropical).
 */
export function estimateWaterTemp(airTempC: number, monthIndex: number): number {
  // Lag factors by month (how closely water tracks air)
  const LAG = [0.4, 0.45, 0.5, 0.6, 0.75, 0.9, 1.0, 0.95, 0.85, 0.7, 0.55, 0.45];
  const lag = LAG[monthIndex] ?? 0.7;
  return Math.min(30, Math.max(0, airTempC * lag));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getWaterTemp(
  lat: number,
  lon: number,
  airTempC: number,
  monthIndex: number
): Promise<WaterTempResult> {
  // Check cache
  const cached = await getWaterTempCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  // Try ECCC
  try {
    const nearest = await findNearestStation(lat, lon);
    if (nearest) {
      const { tempC, ageMs } = await fetchEcccTemp(nearest.station.id);
      const result: WaterTempResult = {
        tempC,
        source: "eccc",
        stationName: nearest.station.name,
        stationId: nearest.station.id,
        ageMs,
      };
      await setWaterTempCache(result);
      return result;
    }
  } catch {
    // Fall through to estimation
  }

  // Fallback: estimate from air temperature
  const result: WaterTempResult = {
    tempC: estimateWaterTemp(airTempC, monthIndex),
    source: "estimated",
  };
  await setWaterTempCache(result);
  return result;
}

/**
 * Seasonal fishing context note for a given species temperature range.
 */
export function getWaterTempContext(
  waterTempC: number,
  species: string,
  optimalRangeC: [number, number]
): string {
  const [low, high] = optimalRangeC;
  if (waterTempC < low - 4)
    return `${waterTempC.toFixed(1)}°C — very cold for ${species}, expect lethargic behaviour`;
  if (waterTempC < low)
    return `${waterTempC.toFixed(1)}°C — slightly cool for ${species}, fish deeper and slower`;
  if (waterTempC <= high)
    return `${waterTempC.toFixed(1)}°C — optimal range for ${species}, expect active feeding`;
  if (waterTempC <= high + 4)
    return `${waterTempC.toFixed(1)}°C — warm for ${species}, fish early morning and evening`;
  return `${waterTempC.toFixed(1)}°C — too warm for ${species}, fish may be in deep, cool water`;
}
