/**
 * Fishing score algorithm.
 * Returns an integer 1–10 from 5 weighted factors.
 * Weights: pressure 35%, solunar 25%, wind 20%, temp 15%, moon phase 5%.
 */
import { getSolunarScore } from "./solunar";
import { getTempScore } from "./climate";
import type { SolunarWindow } from "./solunar";

export interface ScoreInput {
  /** Current surface pressure (hPa) */
  pressureNow: number;
  /** Surface pressure 3 hours ago (hPa) */
  pressure3hAgo: number;
  /** Wind speed in km/h */
  windKmh: number;
  /** Current air temperature °C */
  airTempC: number;
  /** Month index 0–11 */
  monthIndex: number;
  /** Today's solunar windows */
  solunarWindows: SolunarWindow[];
  /** Moon illumination fraction 0–1 */
  moonFraction: number;
  /** Current moment */
  now: Date;
  /** Observer latitude (for seasonal norm adjustment) */
  lat?: number;
}

export interface ScoredFactors {
  pressure: number;   // 0–3.5
  solunar: number;    // 0–2.5
  wind: number;       // 0–2.0
  temp: number;       // 0–1.5
  moon: number;       // 0–0.5
}

export interface ScoreResult {
  /** Integer 1–10 */
  total: number;
  /** Raw float total before rounding */
  raw: number;
  factors: ScoredFactors;
  /** Pressure trend label */
  pressureTrend: PressureTrend;
}

export type PressureTrend =
  | "stable"
  | "rising"
  | "rapidlyRising"
  | "falling"
  | "rapidlyFalling";

// ─── Pressure trend ──────────────────────────────────────────────────────────

export function getPressureTrend(now: number, threeHoursAgo: number): PressureTrend {
  const delta = now - threeHoursAgo;
  if (delta >= 3) return "rapidlyRising";
  if (delta >= 1.5) return "rising";
  if (delta <= -3) return "rapidlyFalling";
  if (delta <= -1.5) return "falling";
  return "stable";
}

function getPressureScore(trend: PressureTrend): number {
  switch (trend) {
    case "stable":         return 3.5;
    case "rising":         return 3.0;
    case "falling":        return 2.5;
    case "rapidlyRising":  return 2.0;
    case "rapidlyFalling": return 1.5;
  }
}

// ─── Wind ────────────────────────────────────────────────────────────────────

function getWindScore(kmh: number): number {
  if (kmh <= 10) return 2.0;
  if (kmh <= 15) return 1.75;
  if (kmh <= 25) return 1.0;
  if (kmh <= 35) return 0.5;
  return 0.0;
}

export function isStormWind(kmh: number): boolean {
  return kmh >= 35;
}

// ─── Moon phase ──────────────────────────────────────────────────────────────

function getMoonPhaseScore(fraction: number): number {
  const pct = fraction * 100;
  if (pct <= 10 || pct >= 90) return 0.5;  // New or Full moon
  if (pct <= 25 || pct >= 75) return 0.3;  // Crescent or Gibbous
  return 0.2;                               // Quarter
}

// ─── Main algorithm ──────────────────────────────────────────────────────────

export function calculateFishingScore(input: ScoreInput): ScoreResult {
  const pressureTrend = getPressureTrend(input.pressureNow, input.pressure3hAgo);

  const factors: ScoredFactors = {
    pressure: getPressureScore(pressureTrend),
    solunar:  getSolunarScore(input.solunarWindows, input.now),
    wind:     getWindScore(input.windKmh),
    temp:     getTempScore(input.airTempC, input.monthIndex, input.lat),
    moon:     getMoonPhaseScore(input.moonFraction),
  };

  const raw = factors.pressure + factors.solunar + factors.wind + factors.temp + factors.moon;
  // Clamp to 1–10 and round to nearest integer
  const total = Math.min(10, Math.max(1, Math.round(raw)));

  return { total, raw, factors, pressureTrend };
}

/**
 * Run the score algorithm for every future hour today and return the peak.
 */
export function getBestWindowToday(
  hourlyForecast: Array<{
    time: number;
    pressureHpa: number;
    windKmh: number;
    airTempC: number;
  }>,
  solunarWindows: SolunarWindow[],
  moonFraction: number,
  now: Date,
  lat?: number
): { time: Date; score: number } | null {
  const nowMs = now.getTime();
  const monthIndex = now.getMonth();

  const future = hourlyForecast.filter((h) => h.time > nowMs);
  if (future.length === 0) return null;

  let best = { time: new Date(future[0].time), score: 0 };

  for (const h of future) {
    // Estimate 3h-ago pressure from the previous 3 entries if available
    const idx = hourlyForecast.indexOf(h);
    const prev3 = idx >= 3 ? hourlyForecast[idx - 3].pressureHpa : h.pressureHpa;

    const result = calculateFishingScore({
      pressureNow: h.pressureHpa,
      pressure3hAgo: prev3,
      windKmh: h.windKmh,
      airTempC: h.airTempC,
      monthIndex,
      solunarWindows,
      moonFraction,
      now: new Date(h.time),
      lat,
    });

    if (result.total > best.score) {
      best = { time: new Date(h.time), score: result.total };
    }
  }

  return best;
}
