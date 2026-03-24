/**
 * Solunar window calculation.
 *
 * Major windows: ±1 hour around moonrise and moonset
 * Minor windows: ±30 min around moon transit (highest point) and anti-transit (lowest)
 *
 * All times in local wall-clock time via Date objects.
 */
import SunCalc from "suncalc";
import type { Location } from "./moon";

export interface SolunarWindow {
  type: "major" | "minor";
  start: Date;
  end: Date;
  /** Human-readable label, e.g. "Major — 2:05 PM – 4:05 PM" */
  label: string;
  /** Center time of the window */
  peak: Date;
}

/**
 * Find the time within [searchStart, searchEnd] at which the moon reaches
 * its highest altitude (transit) or lowest altitude (anti-transit).
 * Uses a simple ternary-search approach at 1-minute resolution.
 */
function findMoonTransit(
  searchStart: Date,
  searchEnd: Date,
  lat: number,
  lon: number,
  findMax: boolean
): Date {
  const startMs = searchStart.getTime();
  const endMs = searchEnd.getTime();
  const stepMs = 60 * 1000; // 1 minute

  let bestTime = startMs;
  let bestAlt = findMax ? -Infinity : Infinity;

  for (let t = startMs; t <= endMs; t += stepMs) {
    const pos = SunCalc.getMoonPosition(new Date(t), lat, lon);
    const alt = pos.altitude;
    if (findMax ? alt > bestAlt : alt < bestAlt) {
      bestAlt = alt;
      bestTime = t;
    }
  }

  return new Date(bestTime);
}

/**
 * Returns today's 4 solunar windows (2 major + 2 minor) for the given date and location.
 * Windows are sorted chronologically.
 */
export function getSolunarWindows(
  date: Date,
  location: Location
): SolunarWindow[] {
  const { lat, lng: lon } = location;

  // Use noon of the given date as reference for getMoonTimes
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);

  const moonTimes = SunCalc.getMoonTimes(noon, lat, lon);

  const windows: SolunarWindow[] = [];

  // ── Major windows around moonrise and moonset ────────────────────────────
  const majorDuration = 60 * 60 * 1000; // ±1h = 2h total

  if (moonTimes.rise && !isNaN(moonTimes.rise.getTime())) {
    const start = new Date(moonTimes.rise.getTime() - majorDuration / 2);
    const end = new Date(moonTimes.rise.getTime() + majorDuration / 2);
    windows.push({ type: "major", start, end, peak: moonTimes.rise, label: "" });
  }

  if (moonTimes.set && !isNaN(moonTimes.set.getTime())) {
    const start = new Date(moonTimes.set.getTime() - majorDuration / 2);
    const end = new Date(moonTimes.set.getTime() + majorDuration / 2);
    windows.push({ type: "major", start, end, peak: moonTimes.set, label: "" });
  }

  // ── Minor windows around transit (peak altitude) and anti-transit ────────
  const minorDuration = 30 * 60 * 1000; // ±30min = 1h total

  // Search for transit in first 24h starting at midnight of the given date
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // Split day into two 12h halves to find both transit and anti-transit
  const midDay = new Date(dayStart.getTime() + 12 * 60 * 60 * 1000);

  const transit = findMoonTransit(dayStart, midDay, lat, lon, true);
  const antiTransit = findMoonTransit(midDay, dayEnd, lat, lon, false);

  windows.push({
    type: "minor",
    start: new Date(transit.getTime() - minorDuration / 2),
    end: new Date(transit.getTime() + minorDuration / 2),
    peak: transit,
    label: "",
  });

  windows.push({
    type: "minor",
    start: new Date(antiTransit.getTime() - minorDuration / 2),
    end: new Date(antiTransit.getTime() + minorDuration / 2),
    peak: antiTransit,
    label: "",
  });

  // Sort chronologically and add labels
  windows.sort((a, b) => a.start.getTime() - b.start.getTime());
  windows.forEach((w) => {
    w.label = `${w.type === "major" ? "Major" : "Minor"} — ${formatWindowTime(w.start)}–${formatWindowTime(w.end)}`;
  });

  return windows;
}

function formatWindowTime(d: Date): string {
  return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Returns the solunar score contribution for the current time (0–2.5 pts).
 * Used by the fishing score algorithm.
 */
export function getSolunarScore(windows: SolunarWindow[], now: Date): number {
  const nowMs = now.getTime();

  for (const w of windows) {
    if (nowMs >= w.start.getTime() && nowMs <= w.end.getTime()) {
      return w.type === "major" ? 2.5 : 1.75;
    }
  }

  // Check if approaching within 1 hour
  for (const w of windows) {
    const minsUntilStart = (w.start.getTime() - nowMs) / 60000;
    if (minsUntilStart > 0 && minsUntilStart <= 60) {
      return w.type === "major" ? 2.0 : 1.25;
    }
  }

  return 0.75;
}

/**
 * Returns the next upcoming solunar window (or null if none today).
 */
export function getNextSolunarWindow(
  windows: SolunarWindow[],
  now: Date
): SolunarWindow | null {
  const nowMs = now.getTime();
  return windows.find((w) => w.end.getTime() > nowMs) ?? null;
}
