/**
 * Monthly Ontario air temperature norms (°C).
 * Based on Environment Canada 1981–2010 climate normals for southern Ontario
 * (Toronto/Ottawa average). Index 0 = January, 11 = December.
 *
 * Used by the fishing score algorithm to evaluate temp-vs-seasonal-norm.
 */

const ONTARIO_MONTHLY_NORMS_C: number[] = [
  -6.3,  // Jan
  -5.3,  // Feb
  -0.5,  // Mar
   6.4,  // Apr
  12.7,  // May
  18.0,  // Jun
  21.2,  // Jul
  20.4,  // Aug
  15.5,  // Sep
   9.0,  // Oct
   3.0,  // Nov
  -3.3,  // Dec
];

/**
 * Returns the seasonal temperature norm for the given month (0-indexed).
 * Optionally adjusted for latitude (northern Ontario runs ~3–5°C colder).
 */
export function getSeasonalNorm(monthIndex: number, lat?: number): number {
  const base = ONTARIO_MONTHLY_NORMS_C[monthIndex] ?? 10;
  if (lat === undefined) return base;
  // Simple latitude adjustment: ~0.5°C colder per degree north of 44°N
  const latAdj = Math.max(0, (lat - 44) * 0.5);
  return base - latAdj;
}

/**
 * Score contribution for air temp vs. seasonal norm (max 1.5 pts).
 */
export function getTempScore(airTempC: number, monthIndex: number, lat?: number): number {
  const norm = getSeasonalNorm(monthIndex, lat);
  const delta = airTempC - norm;

  if (delta >= -3 && delta <= 3) return 1.5;        // Within ±3°C of norm
  if (delta >= 0) return 1.25;                       // Above norm (warm front)
  if (delta >= -6) return 1.0;                       // 3–6°C below (mild cold front)
  if (delta >= -10) return 0.5;                      // 6–10°C below (cold front)
  return 0.0;                                        // >10°C below (severe)
}
