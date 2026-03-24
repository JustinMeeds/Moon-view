/**
 * Generates a one-line human-readable reason string for the fishing score.
 * Picks the top 1–2 factors by their deviation from "neutral" and
 * composes a plain-language description.
 */
import type { ScoredFactors, PressureTrend } from "./score";

// Neutral (mid-range) score for each factor
const NEUTRAL: ScoredFactors = {
  pressure: 2.75,
  solunar:  1.5,
  wind:     1.5,
  temp:     1.0,
  moon:     0.35,
};

type FactorKey = keyof ScoredFactors;

function deviation(factors: ScoredFactors): Array<{ key: FactorKey; delta: number }> {
  return (Object.keys(NEUTRAL) as FactorKey[])
    .map((key) => ({ key, delta: factors[key] - NEUTRAL[key] }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

const PRESSURE_REASON: Record<PressureTrend, string> = {
  stable:         "Stable pressure — ideal feeding conditions",
  rising:         "Slowly rising pressure — good early activity",
  rapidlyRising:  "Rapidly rising pressure — short active burst expected",
  falling:        "Falling pressure — fish feeding aggressively ahead of front",
  rapidlyFalling: "Rapidly falling pressure — excellent window before the front hits",
};

const SOLUNAR_REASON_HIGH = "Major solunar window active or approaching";
const SOLUNAR_REASON_MID  = "Minor solunar window active";
const SOLUNAR_REASON_LOW  = "No solunar window nearby";

const WIND_REASON_HIGH = "Calm winds — fish will be active near surface";
const WIND_REASON_LOW  = "Strong winds — seek sheltered bays";
const WIND_REASON_STORM = "Dangerous wind — stay off the water";

const TEMP_REASON_HIGH = "Comfortable air temperature for the season";
const TEMP_REASON_LOW  = "Cold front reducing activity";

export function generateReason(
  factors: ScoredFactors,
  pressureTrend: PressureTrend
): string {
  const ranked = deviation(factors);
  const top = ranked.slice(0, 2);

  const phrases: string[] = [];

  for (const { key, delta } of top) {
    if (Math.abs(delta) < 0.2) continue; // not significant enough to mention

    switch (key) {
      case "pressure":
        phrases.push(PRESSURE_REASON[pressureTrend]);
        break;
      case "solunar":
        if (factors.solunar >= 2.0) phrases.push(SOLUNAR_REASON_HIGH);
        else if (factors.solunar >= 1.5) phrases.push(SOLUNAR_REASON_MID);
        else phrases.push(SOLUNAR_REASON_LOW);
        break;
      case "wind":
        if (factors.wind === 0.0) phrases.push(WIND_REASON_STORM);
        else if (factors.wind >= 1.75) phrases.push(WIND_REASON_HIGH);
        else if (delta < 0) phrases.push(WIND_REASON_LOW);
        break;
      case "temp":
        if (delta > 0) phrases.push(TEMP_REASON_HIGH);
        else if (delta < -0.3) phrases.push(TEMP_REASON_LOW);
        break;
      case "moon":
        // Moon phase rarely dominates; skip if other factors say more
        break;
    }

    if (phrases.length >= 2) break;
  }

  if (phrases.length === 0) return "Moderate conditions";
  return phrases.join(" · ");
}
