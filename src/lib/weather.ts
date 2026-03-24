/**
 * Open-Meteo weather fetch + IndexedDB cache.
 * No API key required.
 */
import { getWeatherCache, setWeatherCache } from "./offline";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface HourlyPoint {
  /** Unix ms timestamp */
  time: number;
  airTempC: number;
  windKmh: number;
  windDirDeg: number;
  precipProb: number;
  precipMm: number;
  pressureHpa: number;
  cloudCoverPct: number;
  humidityPct: number;
  weatherCode: number;
}

export interface CurrentWeather {
  airTempC: number;
  windKmh: number;
  windDirDeg: number;
  weatherCode: number;
  isDay: boolean;
}

export interface WeatherData {
  current: CurrentWeather;
  /** 48h of hourly data (past 24h + next 24h), used for pressure trend + sparkline */
  hourly: HourlyPoint[];
  fetchedAt: number;
  lat: number;
  lon: number;
}

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    windspeed_10m: number[];
    winddirection_10m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    surface_pressure: number[];
    cloudcover: number[];
    relativehumidity_2m: number[];
    weathercode: number[];
  };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      "temperature_2m",
      "windspeed_10m",
      "winddirection_10m",
      "precipitation_probability",
      "precipitation",
      "surface_pressure",
      "cloudcover",
      "relativehumidity_2m",
      "weathercode",
    ].join(","),
    current_weather: "true",
    forecast_days: "2",
    timezone: "auto",
  });

  const res = await fetch(`${OPEN_METEO_BASE}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

  const raw: OpenMeteoResponse = await res.json();

  const hourly: HourlyPoint[] = raw.hourly.time.map((isoTime, i) => ({
    time: new Date(isoTime).getTime(),
    airTempC: raw.hourly.temperature_2m[i],
    windKmh: raw.hourly.windspeed_10m[i],
    windDirDeg: raw.hourly.winddirection_10m[i],
    precipProb: raw.hourly.precipitation_probability[i],
    precipMm: raw.hourly.precipitation[i],
    pressureHpa: raw.hourly.surface_pressure[i],
    cloudCoverPct: raw.hourly.cloudcover[i],
    humidityPct: raw.hourly.relativehumidity_2m[i],
    weatherCode: raw.hourly.weathercode[i],
  }));

  const data: WeatherData = {
    current: {
      airTempC: raw.current_weather.temperature,
      windKmh: raw.current_weather.windspeed,
      windDirDeg: raw.current_weather.winddirection,
      weatherCode: raw.current_weather.weathercode,
      isDay: raw.current_weather.is_day === 1,
    },
    hourly,
    fetchedAt: Date.now(),
    lat,
    lon,
  };

  await setWeatherCache(data);
  return data;
}

/**
 * Returns weather from cache if fresh enough, otherwise returns null.
 */
export async function getCachedWeather(maxAgeMs = CACHE_TTL_MS): Promise<WeatherData | null> {
  const cached = await getWeatherCache();
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > maxAgeMs) return null;
  return cached.data;
}

/**
 * Returns stale cached data regardless of age (for offline use).
 */
export async function getStaleCachedWeather(): Promise<WeatherData | null> {
  const cached = await getWeatherCache();
  return cached?.data ?? null;
}

/**
 * Gets the current pressure and the pressure 3 hours ago from hourly data.
 * Used to compute pressure trend for the score algorithm.
 */
export function getPressurePoints(
  hourly: HourlyPoint[],
  now: Date
): { pressureNow: number; pressure3hAgo: number } | null {
  const nowMs = now.getTime();

  // Find the closest hourly entry to now
  let closestIdx = 0;
  let closestDiff = Infinity;
  for (let i = 0; i < hourly.length; i++) {
    const diff = Math.abs(hourly[i].time - nowMs);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestIdx = i;
    }
  }

  if (closestIdx < 3) return null; // Not enough history

  return {
    pressureNow: hourly[closestIdx].pressureHpa,
    pressure3hAgo: hourly[closestIdx - 3].pressureHpa,
  };
}

/**
 * Pressure trend label for display.
 */
export function getPressureTrendLabel(delta: number): string {
  if (delta >= 3) return "↗↗ Rapidly Rising";
  if (delta >= 1.5) return "↗ Rising";
  if (delta <= -3) return "↘↘ Rapidly Falling";
  if (delta <= -1.5) return "↘ Falling";
  return "→ Stable";
}

/**
 * Fishing implication for pressure trend.
 */
export function getPressureImplication(delta: number): string {
  if (delta <= -3) return "Rapidly falling pressure — fish often feed aggressively just before a front";
  if (delta <= -1.5) return "Falling pressure — expect increased feeding activity";
  if (delta >= 3) return "Rapidly rising pressure — activity may be sluggish as fish adjust";
  if (delta >= 1.5) return "Rising pressure — conditions improving, fish becoming more active";
  return "Stable pressure — consistent, predictable feeding behaviour";
}
