import * as Astronomy from "astronomy-engine";
import { azimuthToCardinal, buildTimeRange } from "./utils";

export interface Location {
  lat: number;
  lng: number;
  label?: string;
}

export interface MoonPosition {
  altitudeDeg: number;
  azimuthDeg: number;
  cardinal: string;
  isVisible: boolean;
  distanceKm: number;
}

export interface MoonPhase {
  fraction: number; // 0–1 illuminated
  phase: number;    // 0–1 phase cycle
  label: string;
  emoji: string;
}

export interface MoonTimes {
  rise: Date | null;
  set: Date | null;
  alwaysUp: boolean;
  alwaysDown: boolean;
}

export interface ChartPoint {
  time: Date;
  timestamp: number;
  altitudeDeg: number;
  azimuthDeg: number;
  cardinal: string;
  isVisible: boolean;
}

export interface NightSummary {
  chartPoints: ChartPoint[];
  moonrise: Date | null;
  moonset: Date | null;
  peak: ChartPoint | null;
  bestWindowStart: Date | null;
  bestWindowEnd: Date | null;
  phase: MoonPhase;
}

function observer(loc: Location): Astronomy.Observer {
  return new Astronomy.Observer(loc.lat, loc.lng, 0);
}

/** Geocentric moon distance in km */
function moonDistanceKm(date: Date): number {
  const vec = Astronomy.GeoVector(Astronomy.Body.Moon, date, true);
  return vec.Length() * Astronomy.KM_PER_AU;
}

export function getMoonPosition(date: Date, loc: Location): MoonPosition {
  const obs = observer(loc);
  const eq = Astronomy.Equator(Astronomy.Body.Moon, date, obs, true, true);
  // Airless (unrefracted) topocentric altitude — matches USNO convention
  const hor = Astronomy.Horizon(date, obs, eq.ra, eq.dec);
  return {
    altitudeDeg: hor.altitude,
    azimuthDeg: hor.azimuth,
    cardinal: azimuthToCardinal(hor.azimuth),
    isVisible: hor.altitude > 0,
    distanceKm: moonDistanceKm(date),
  };
}

const PHASE_NAMES: { max: number; label: string; emoji: string }[] = [
  { max: 0.0625, label: "New Moon",        emoji: "🌑" },
  { max: 0.1875, label: "Waxing Crescent", emoji: "🌒" },
  { max: 0.3125, label: "First Quarter",   emoji: "🌓" },
  { max: 0.4375, label: "Waxing Gibbous",  emoji: "🌔" },
  { max: 0.5625, label: "Full Moon",        emoji: "🌕" },
  { max: 0.6875, label: "Waning Gibbous",  emoji: "🌖" },
  { max: 0.8125, label: "Last Quarter",    emoji: "🌗" },
  { max: 0.9375, label: "Waning Crescent", emoji: "🌘" },
  { max: 1.0001, label: "New Moon",        emoji: "🌑" },
];

export function getMoonPhase(date: Date): MoonPhase {
  // MoonPhase: ecliptic longitude difference in degrees — 0=new, 90=FQ, 180=full, 270=LQ
  const phase = Astronomy.MoonPhase(date) / 360;
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const entry = PHASE_NAMES.find((p) => phase <= p.max)!;
  return {
    fraction: illum.phase_fraction,
    phase,
    label: entry.label,
    emoji: entry.emoji,
  };
}

/** Rise/set events within the local calendar day containing `date` */
export function getMoonTimes(date: Date, loc: Location): MoonTimes {
  const obs = observer(loc);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const rise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, +1, dayStart, 1);
  const set = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, -1, dayStart, 1);

  let alwaysUp = false;
  let alwaysDown = false;
  if (!rise && !set) {
    // No events all day — moon is either up or down the whole time
    const midday = new Date(dayStart.getTime() + 12 * 3_600_000);
    const eq = Astronomy.Equator(Astronomy.Body.Moon, midday, obs, true, true);
    const hor = Astronomy.Horizon(midday, obs, eq.ra, eq.dec);
    alwaysUp = hor.altitude > 0;
    alwaysDown = !alwaysUp;
  }

  return {
    rise: rise ? rise.date : null,
    set: set ? set.date : null,
    alwaysUp,
    alwaysDown,
  };
}

// ─── Lunar distance ──────────────────────────────────────────────────────────

const MOON_MIN_KM = 356_500;
const MOON_MAX_KM = 406_700;
const SUPERMOON_KM = 362_000;

export interface LunarDistance {
  distanceKm: number;
  percentClose: number;    // 0 = apogee, 100 = perigee
  isSupermoon: boolean;
  nextPerigee: Date | null;
  nextPerigeeKm: number | null;
}

export function getLunarDistance(date: Date, loc?: Location): LunarDistance {
  void loc; // distance is geocentric; param kept for API stability
  const distanceKm = moonDistanceKm(date);
  const pct = Math.round(
    Math.max(0, Math.min(100, ((MOON_MAX_KM - distanceKm) / (MOON_MAX_KM - MOON_MIN_KM)) * 100))
  );
  const phase = getMoonPhase(date);
  const isSupermoon = distanceKm < SUPERMOON_KM && phase.fraction > 0.85;
  const next = findNextPerigee(date);
  return {
    distanceKm: Math.round(distanceKm),
    percentClose: pct,
    isSupermoon,
    nextPerigee: next?.date ?? null,
    nextPerigeeKm: next ? Math.round(next.distanceKm) : null,
  };
}

function findNextPerigee(from: Date): { date: Date; distanceKm: number } | null {
  let apsis = Astronomy.SearchLunarApsis(from);
  if (apsis.kind !== Astronomy.ApsisKind.Pericenter) {
    apsis = Astronomy.NextLunarApsis(apsis);
  }
  return { date: apsis.time.date, distanceKm: apsis.dist_km };
}

// ─── Azimuth finder ──────────────────────────────────────────────────────────

export interface AzimuthMatch {
  date: Date;
  time: Date;
  type: "rise" | "set";
  azimuthDeg: number;
  deltaDeg: number;
}

export function findDatesForAzimuth(
  targetAz: number,
  from: Date,
  days: number,
  loc: Location,
  toleranceDeg = 4
): AzimuthMatch[] {
  const results: AzimuthMatch[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(from);
    day.setDate(day.getDate() + i);
    day.setHours(12, 0, 0, 0);

    const times = getMoonTimes(day, loc);

    const check = (t: Date | null, type: "rise" | "set") => {
      if (!t) return;
      const pos = getMoonPosition(t, loc);
      const delta = Math.min(
        Math.abs(pos.azimuthDeg - targetAz),
        360 - Math.abs(pos.azimuthDeg - targetAz)
      );
      if (delta <= toleranceDeg) {
        results.push({
          date: new Date(t.toDateString()),
          time: t,
          type,
          azimuthDeg: Math.round(pos.azimuthDeg * 10) / 10,
          deltaDeg: Math.round(delta * 10) / 10,
        });
      }
    };

    check(times.rise, "rise");
    check(times.set, "set");
  }
  return results;
}

/** Build chart data for a full 24-hour day: midnight → midnight (15-min steps) */
export function buildNightChart(date: Date, loc: Location, stepMinutes = 15): NightSummary {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  const times = buildTimeRange(start, end, stepMinutes);
  const phase = getMoonPhase(date);

  const chartPoints: ChartPoint[] = times.map((t) => {
    const pos = getMoonPosition(t, loc);
    return {
      time: t,
      timestamp: t.getTime(),
      altitudeDeg: Math.round(pos.altitudeDeg * 10) / 10,
      azimuthDeg: Math.round(pos.azimuthDeg * 10) / 10,
      cardinal: pos.cardinal,
      isVisible: pos.isVisible,
    };
  });

  // Moonrise / moonset for the date
  const moonTimes = getMoonTimes(date, loc);

  // Peak: highest altitude point
  const peak = chartPoints.reduce<ChartPoint | null>((best, p) =>
    best === null || p.altitudeDeg > best.altitudeDeg ? p : best, null);

  // Best viewing window: longest contiguous stretch above horizon
  let bestWindowStart: Date | null = null;
  let bestWindowEnd: Date | null = null;
  let longestLen = 0;
  let runStart: Date | null = null;
  let runLen = 0;

  for (const p of chartPoints) {
    if (p.isVisible) {
      if (runStart === null) runStart = p.time;
      runLen++;
      if (runLen > longestLen) {
        longestLen = runLen;
        bestWindowStart = runStart;
        bestWindowEnd = p.time;
      }
    } else {
      runStart = null;
      runLen = 0;
    }
  }

  return {
    chartPoints,
    moonrise: moonTimes.rise,
    moonset: moonTimes.set,
    peak,
    bestWindowStart,
    bestWindowEnd,
    phase,
  };
}
