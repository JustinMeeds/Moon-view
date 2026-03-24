/**
 * Ontario fishing regulations: types, merge logic, and season status.
 *
 * Data model: province-wide defaults + per-FMZ override objects merged at query time.
 * Schema matches public/data/regulations-2025.json.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeasonType = "open" | "catch_and_release" | "closed";
export type SeasonStatus = "IN_SEASON" | "CATCH_AND_RELEASE" | "CLOSED";
export type SizeLimitType = "minimum" | "slot" | "maximum" | null;

export interface SeasonWindow {
  type: SeasonType;
  open_month: number;   // 1–12
  open_day: number;
  close_month: number;
  close_day: number;
  label: string;
}

export interface RegulationRule {
  seasons: SeasonWindow[];
  size_limit_cm: number | null;
  size_limit_type: SizeLimitType;
  slot_range_cm?: [number, number];
  possession_limit: number | null;
  daily_limit: number | null;
  notes: string | null;
}

export interface FMZOverride {
  fmz_ids: number[];
  rule: Partial<RegulationRule>;
  notes: string | null;
}

export interface SpeciesRegulation {
  id: string;
  common_name: string;
  scientific_name: string;
  default: RegulationRule;
  fmz_overrides: FMZOverride[];
}

export interface SpecialWater {
  id: string;
  name: string;
  fmz_id: number;
  restriction_type: "catch_and_release" | "closed" | "special_limits";
  description: string;
  centroid: [number, number]; // [lat, lon]
  radius_km: number;
}

export interface RegulationsData {
  version: string;
  effective_date: string;
  next_update_expected: string;
  last_verified_by_human: string;
  species: SpeciesRegulation[];
  special_waters: SpecialWater[];
}

export interface MergedRegulation extends RegulationRule {
  hasOverride: boolean;
  overrideNotes: string | null;
}

// ─── Merge ────────────────────────────────────────────────────────────────────

export function getRegulationForZone(
  species: SpeciesRegulation,
  fmzId: number
): MergedRegulation {
  const base = species.default;
  const override = species.fmz_overrides.find((o) => o.fmz_ids.includes(fmzId));

  if (!override) {
    return { ...base, hasOverride: false, overrideNotes: null };
  }

  return {
    ...base,
    ...override.rule,
    // Seasons from override replace entirely (not merged) if specified
    seasons: override.rule.seasons ?? base.seasons,
    hasOverride: true,
    overrideNotes: override.notes,
  };
}

// ─── Season status ────────────────────────────────────────────────────────────

interface MonthDay {
  month: number;
  day: number;
}

function toMonthDay(date: Date): MonthDay {
  return { month: date.getMonth() + 1, day: date.getDate() };
}

function isWithinWindow(current: MonthDay, window: SeasonWindow): boolean {
  const { open_month, open_day, close_month, close_day } = window;

  const openVal  = open_month * 100  + open_day;
  const closeVal = close_month * 100 + close_day;
  const curVal   = current.month * 100 + current.day;

  // Season spans a calendar year boundary (e.g. Dec → Feb) — rare in Ontario
  if (openVal > closeVal) {
    return curVal >= openVal || curVal <= closeVal;
  }

  return curVal >= openVal && curVal <= closeVal;
}

/**
 * Returns the most permissive active season type for today's date.
 * Priority: open > catch_and_release > closed.
 */
export function getSeasonStatus(
  regulation: MergedRegulation,
  date: Date
): SeasonStatus {
  const today = toMonthDay(date);

  let bestType: SeasonType = "closed";

  for (const window of regulation.seasons) {
    if (isWithinWindow(today, window)) {
      if (window.type === "open") {
        return "IN_SEASON"; // Can't do better than open
      }
      if (window.type === "catch_and_release") {
        bestType = "catch_and_release";
      }
    }
  }

  if (bestType === "catch_and_release") return "CATCH_AND_RELEASE";
  return "CLOSED";
}

// ─── Special waters proximity ─────────────────────────────────────────────────

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
 * Returns special waters within radius of the user's location.
 * Only checks waters in the current FMZ for performance.
 */
export function getNearbySpecialWaters(
  lat: number,
  lon: number,
  fmzId: number,
  allWaters: SpecialWater[]
): SpecialWater[] {
  return allWaters.filter((w) => {
    if (w.fmz_id !== fmzId) return false;
    const [wLat, wLon] = w.centroid;
    return haversineKm(lat, lon, wLat, wLon) <= w.radius_km;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatSeasonDates(window: SeasonWindow): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const open  = `${months[window.open_month - 1]} ${window.open_day}`;
  const close = `${months[window.close_month - 1]} ${window.close_day}`;
  return `${open} – ${close}`;
}

export function formatSizeLimit(regulation: MergedRegulation): string {
  if (!regulation.size_limit_cm) return "No size limit";
  if (regulation.size_limit_type === "slot" && regulation.slot_range_cm) {
    return `Slot limit: ${regulation.slot_range_cm[0]}–${regulation.slot_range_cm[1]} cm`;
  }
  if (regulation.size_limit_type === "maximum") {
    return `Max ${regulation.size_limit_cm} cm`;
  }
  return `${regulation.size_limit_cm} cm minimum`;
}

export function formatPossessionLimit(regulation: MergedRegulation): string {
  if (!regulation.possession_limit) return "No limit";
  return `${regulation.possession_limit} fish`;
}
