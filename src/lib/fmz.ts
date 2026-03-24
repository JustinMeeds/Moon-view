/**
 * FMZ (Fisheries Management Zone) detection and lookup.
 *
 * Uses bundled low-res TopoJSON + @turf/boolean-point-in-polygon for GPS detection.
 * Falls back to manual zone picker if GPS is unavailable or point falls on boundary.
 */
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Feature, Polygon, MultiPolygon, Point } from "geojson";

const FMZ_TOPOJSON_PATH = "/data/fmz-lowres.topojson";
const FMZ_CITIES_PATH = "/data/fmz-cities.json";
/** Warn user if within this many km of a zone boundary */
const BOUNDARY_WARNING_KM = 5;

// ─── FMZ reference list ───────────────────────────────────────────────────────

export interface FMZEntry {
  id: number;
  name: string;
  label: string;
}

export const FMZ_LIST: FMZEntry[] = [
  { id: 1,  name: "FMZ 1",  label: "Lake of the Woods" },
  { id: 2,  name: "FMZ 2",  label: "Rainy Lake / Seine River" },
  { id: 3,  name: "FMZ 3",  label: "Quetico / English River" },
  { id: 4,  name: "FMZ 4",  label: "Wabigoon / Sturgeon River" },
  { id: 5,  name: "FMZ 5",  label: "Nipigon / Black Sturgeon" },
  { id: 6,  name: "FMZ 6",  label: "Thunder Bay" },
  { id: 7,  name: "FMZ 7",  label: "Lake Superior" },
  { id: 8,  name: "FMZ 8",  label: "Sault Ste. Marie" },
  { id: 9,  name: "FMZ 9",  label: "Sudbury / Espanola" },
  { id: 10, name: "FMZ 10", label: "North Bay / Mattawa" },
  { id: 11, name: "FMZ 11", label: "Upper Ottawa" },
  { id: 12, name: "FMZ 12", label: "Haliburton / Bancroft" },
  { id: 13, name: "FMZ 13", label: "Muskoka / Algonquin" },
  { id: 14, name: "FMZ 14", label: "Georgian Bay" },
  { id: 15, name: "FMZ 15", label: "Kawartha Lakes" },
  { id: 16, name: "FMZ 16", label: "Lake Erie (north shore)" },
  { id: 17, name: "FMZ 17", label: "Lake Ontario / Lake Simcoe" },
  { id: 18, name: "FMZ 18", label: "Upper St. Lawrence" },
  { id: 19, name: "FMZ 19", label: "Lake Nipissing" },
  { id: 20, name: "FMZ 20", label: "Lake Huron (north)" },
];

export function fmzLabel(id: number): string {
  return FMZ_LIST.find((z) => z.id === id)?.label ?? `FMZ ${id}`;
}

export function fmzName(id: number): string {
  return FMZ_LIST.find((z) => z.id === id)?.name ?? `FMZ ${id}`;
}

// ─── TopoJSON loading ─────────────────────────────────────────────────────────

type FmzFeature = Feature<Polygon | MultiPolygon, { fmz_id?: number; FMZ?: number; ZONE?: number }>;

let cachedFeatures: FmzFeature[] | null = null;

async function loadFmzFeatures(): Promise<FmzFeature[]> {
  if (cachedFeatures) return cachedFeatures;

  const res = await fetch(FMZ_TOPOJSON_PATH);
  if (!res.ok) return []; // gracefully degrade — city fallback still works

  const topo: Topology = await res.json();
  const layerKey = Object.keys(topo.objects)[0];
  const geojson = feature(topo, topo.objects[layerKey]) as {
    type: "FeatureCollection";
    features: FmzFeature[];
  };

  cachedFeatures = geojson.features;
  return cachedFeatures;
}

// ─── Point-in-polygon detection ───────────────────────────────────────────────

export async function detectFmz(lat: number, lon: number): Promise<number | null> {
  const features = await loadFmzFeatures();
  const point: Feature<Point> = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {},
  };

  for (const f of features) {
    if (booleanPointInPolygon(point, f)) {
      // Try common property names from the GeoJSON attributes
      const props = f.properties;
      const id = props?.fmz_id ?? props?.FMZ ?? props?.ZONE;
      if (id != null) return Number(id);
    }
  }

  return null;
}

// ─── Boundary proximity check ─────────────────────────────────────────────────

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

/**
 * Returns true if the user's GPS point is within BOUNDARY_WARNING_KM of
 * a border with a different FMZ zone. Checks a grid of nearby points.
 */
export async function isNearBoundary(
  lat: number,
  lon: number,
  fmzId: number
): Promise<boolean> {
  const features = await loadFmzFeatures();
  const point: Feature<Point> = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {},
  };

  // Check 8 points ~3km away in cardinal/intercardinal directions
  const offsetDeg = 0.027; // ~3km at mid-Ontario latitude
  const offsets = [
    [offsetDeg, 0], [-offsetDeg, 0], [0, offsetDeg], [0, -offsetDeg],
    [offsetDeg, offsetDeg], [offsetDeg, -offsetDeg],
    [-offsetDeg, offsetDeg], [-offsetDeg, -offsetDeg],
  ];

  for (const [dlat, dlon] of offsets) {
    const testPoint: Feature<Point> = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon + dlon, lat + dlat] },
      properties: {},
    };

    for (const f of features) {
      if (booleanPointInPolygon(testPoint, f)) {
        const props = f.properties;
        const id = Number(props?.fmz_id ?? props?.FMZ ?? props?.ZONE);
        if (id !== fmzId) {
          // Nearby point is in a different zone — we're near a border
          const distKm = haversineKm(lat, lon, lat + dlat, lon + dlon);
          if (distKm <= BOUNDARY_WARNING_KM) return true;
        }
      }
    }
  }

  return false;
}

// ─── City → FMZ lookup ────────────────────────────────────────────────────────

interface CityEntry {
  name: string;
  fmz: number;
}

let cityCache: CityEntry[] | null = null;

async function loadCities(): Promise<CityEntry[]> {
  if (cityCache) return cityCache;
  const res = await fetch(FMZ_CITIES_PATH);
  if (!res.ok) return [];
  cityCache = await res.json();
  return cityCache!;
}

/**
 * Fuzzy-match a query string against known Ontario cities/lakes.
 * Returns the FMZ number or null if no match found.
 */
export async function fmzFromCity(query: string): Promise<number | null> {
  const cities = await loadCities();
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exact match first
  const exact = cities.find((c) => c.name.toLowerCase() === q);
  if (exact) return exact.fmz;

  // Prefix match
  const prefix = cities.find((c) => c.name.toLowerCase().startsWith(q));
  if (prefix) return prefix.fmz;

  // Contains match
  const contains = cities.find((c) => c.name.toLowerCase().includes(q));
  if (contains) return contains.fmz;

  return null;
}
