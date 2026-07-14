/**
 * Test fixtures — authoritative astronomical reference values.
 *
 * Sources:
 *  - USNO rstt/oneday API (rise/set/phase, tz=0 → all times UT, events per UT date)
 *  - USNO moon/phases API (phase instants, UT)
 *  - USNO celnav API (topocentric alt/az, derived: alt_topo = hc − pa, airless)
 *  - Geocentric distances corroborated via celnav horizontal parallax (±0.3%)
 *
 * Fetched 2026-07-14. DO NOT edit values — they are external truth.
 * Tests MUST run with TZ=UTC (rise/set "day" semantics depend on it).
 */

export const NYC = { lat: 40.7128, lng: -74.006, label: "New York" };
export const SYD = { lat: -33.8688, lng: 151.2093, label: "Sydney" };
export const REY = { lat: 64.1466, lng: -21.9426, label: "Reykjavik" };

/** Rise/set events falling on the given UT date (USNO rstt/oneday, tz=0). */
export const RISE_SET = [
  {
    loc: NYC, date: "2026-07-14",
    sunriseUT: "09:37", sunsetUT: "00:27",
    moonriseUT: "09:31", moonsetUT: "00:19",
  },
  {
    loc: SYD, date: "2026-07-14",
    sunriseUT: "20:58", sunsetUT: "07:04",
    moonriseUT: "21:40", moonsetUT: "06:41",
  },
  {
    loc: REY, date: "2026-01-05",
    sunriseUT: "11:14", sunsetUT: "15:52",
    moonriseUT: "19:08", moonsetUT: "12:33",
  },
] as const;

/** Principal phase instants, UT (USNO moon/phases). phase: 0=new, 0.25=FQ, 0.5=full, 0.75=LQ */
export const PHASE_INSTANTS = [
  { iso: "2026-07-14T09:43:00Z", name: "New Moon", phase: 0, minFraction: 0, maxFraction: 0.02 },
  { iso: "2026-07-21T11:05:00Z", name: "First Quarter", phase: 0.25, minFraction: 0.47, maxFraction: 0.53 },
  { iso: "2026-07-29T14:36:00Z", name: "Full Moon", phase: 0.5, minFraction: 0.98, maxFraction: 1 },
  { iso: "2026-08-06T02:21:00Z", name: "Last Quarter", phase: 0.75, minFraction: 0.47, maxFraction: 0.53 },
] as const;

/** Topocentric airless moon positions (USNO celnav) + geocentric distance. */
export const MOON_POSITIONS = [
  {
    loc: SYD, iso: "2026-01-05T12:00:00Z",
    altitudeDeg: 11.077, azimuthDeg: 56.966, geoDistanceKm: 370_800,
  },
  {
    loc: NYC, iso: "2026-07-30T04:00:00Z",
    altitudeDeg: 26.644, azimuthDeg: 155.874, geoDistanceKm: 398_067,
  },
] as const;

/** Illuminated fraction on a date (USNO fracillum, ±3%). */
export const ILLUMINATION = [
  { iso: "2026-01-05T12:00:00Z", fraction: 0.94, tolerance: 0.03 },
] as const;

/**
 * Tolerances. Current values sized for SunCalc (geocentric altitude, truncated
 * distance series). After migration to astronomy-engine, tighten to the
 * `engine` targets in the comments. Loosening any of these to make a test
 * pass is NOT allowed — a failure outside tolerance is a real finding.
 */
export const TOL = {
  // astronomy-engine targets (pre-migration SunCalc needed 10 / 5 / 1.5 / 1.0 / 7000 / 0.012)
  moonRiseSetMinutes: 2,
  sunRiseSetMinutes: 2,
  altitudeDeg: 0.05,
  azimuthDeg: 0.05,
  distanceKm: 300,
  phaseCycle: 0.002, // ~±85 min on the 29.53-day cycle
} as const;

/** Moon perigee distance is always within this range (km). */
export const PERIGEE_RANGE_KM = { min: 356_400, max: 370_500 } as const;
