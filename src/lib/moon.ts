import SunCalc from "suncalc";
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

/** SunCalc altitude is in radians from the horizon */
function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

/** SunCalc azimuth is in radians, measured from South, clockwise.
 *  We want 0=North, clockwise (standard compass). */
function suncalcAzimuthToCompass(az: number): number {
  // SunCalc gives azimuth from South, clockwise in radians
  return ((radToDeg(az) + 180) % 360 + 360) % 360;
}

export function getMoonPosition(date: Date, loc: Location): MoonPosition {
  const pos = SunCalc.getMoonPosition(date, loc.lat, loc.lng);
  const altitudeDeg = radToDeg(pos.altitude);
  const azimuthDeg = suncalcAzimuthToCompass(pos.azimuth);
  return {
    altitudeDeg,
    azimuthDeg,
    cardinal: azimuthToCardinal(azimuthDeg),
    isVisible: altitudeDeg > 0,
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
  const illum = SunCalc.getMoonIllumination(date);
  const phase = illum.phase;
  const entry = PHASE_NAMES.find((p) => phase <= p.max)!;
  return {
    fraction: illum.fraction,
    phase,
    label: entry.label,
    emoji: entry.emoji,
  };
}

export function getMoonTimes(date: Date, loc: Location): MoonTimes {
  const times = SunCalc.getMoonTimes(date, loc.lat, loc.lng);
  return {
    rise: times.rise instanceof Date ? times.rise : null,
    set: times.set instanceof Date ? times.set : null,
    alwaysUp: !!(times as { alwaysUp?: boolean }).alwaysUp,
    alwaysDown: !!(times as { alwaysDown?: boolean }).alwaysDown,
  };
}

/** Build chart data for a night: 6 PM → 6 AM next day (15-min steps) */
export function buildNightChart(date: Date, loc: Location, stepMinutes = 15): NightSummary {
  // Night spans local 18:00 on `date` to 06:00 next morning
  const start = new Date(date);
  start.setHours(18, 0, 0, 0);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);
  end.setHours(6, 0, 0, 0);

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

  // Moonrise / moonset from SunCalc for the date
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
