/**
 * Typed IndexedDB helpers via idb-keyval.
 * All keys are namespaced under the "caston" store.
 */
import { get, set, del, createStore } from "idb-keyval";
import type { WeatherData } from "./weather";
import type { WaterTempResult } from "./waterTemp";
import type { RegulationsData } from "./regulations";

const store = createStore("caston-db", "caston-store");

// ─── Weather ────────────────────────────────────────────────────────────────

export interface CachedWeather {
  data: WeatherData;
  fetchedAt: number; // ms timestamp
}

export async function getWeatherCache(): Promise<CachedWeather | null> {
  return (await get<CachedWeather>("weather:latest", store)) ?? null;
}

export async function setWeatherCache(data: WeatherData): Promise<void> {
  await set("weather:latest", { data, fetchedAt: Date.now() }, store);
}

// ─── Water temp ─────────────────────────────────────────────────────────────

export interface CachedWaterTemp {
  data: WaterTempResult;
  fetchedAt: number;
}

export async function getWaterTempCache(): Promise<CachedWaterTemp | null> {
  return (await get<CachedWaterTemp>("watertemp:latest", store)) ?? null;
}

export async function setWaterTempCache(data: WaterTempResult): Promise<void> {
  await set("watertemp:latest", { data, fetchedAt: Date.now() }, store);
}

// ─── Regulations ─────────────────────────────────────────────────────────────

export async function getRegulationsCache(): Promise<RegulationsData | null> {
  return (await get<RegulationsData>("regulations:data", store)) ?? null;
}

export async function setRegulationsCache(data: RegulationsData): Promise<void> {
  await set("regulations:data", data, store);
}

export async function getRegulationsVersion(): Promise<string | null> {
  return (await get<string>("regulations:version", store)) ?? null;
}

export async function setRegulationsVersion(version: string): Promise<void> {
  await set("regulations:version", version, store);
}

// ─── FMZ ─────────────────────────────────────────────────────────────────────

export interface StoredFmz {
  fmz: number;
  lat: number;
  lon: number;
  detectedAt: number;
  source: "gps" | "manual";
}

export async function getFmzCache(): Promise<StoredFmz | null> {
  return (await get<StoredFmz>("fmz:current", store)) ?? null;
}

export async function setFmzCache(entry: StoredFmz): Promise<void> {
  await set("fmz:current", entry, store);
}

export async function clearFmzCache(): Promise<void> {
  await del("fmz:current", store);
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface StoredLocation {
  lat: number;
  lon: number;
  label?: string;
  updatedAt: number;
}

export async function getLocationCache(): Promise<StoredLocation | null> {
  return (await get<StoredLocation>("location:current", store)) ?? null;
}

export async function setLocationCache(loc: StoredLocation): Promise<void> {
  await set("location:current", loc, store);
}
