import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert azimuth degrees to 16-point cardinal direction label */
export function azimuthToCardinal(azimuth: number): string {
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(((azimuth % 360) + 360) % 360 / 22.5) % 16;
  return directions[index];
}

/** Format degrees with a ° suffix */
export function formatDeg(n: number, decimals = 0): string {
  return `${n.toFixed(decimals)}°`;
}

/** Format altitude: e.g. "+29°" or "−12°" */
export function formatAltitude(alt: number): string {
  const sign = alt >= 0 ? "+" : "−";
  return `${sign}${Math.abs(alt).toFixed(0)}°`;
}

/** Format time as HH:MM or h:MM AM/PM */
export function formatTime(date: Date, use24h: boolean): string {
  if (use24h) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Clamp a number between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Build a range of Date objects spanning start → end in minute increments */
export function buildTimeRange(start: Date, end: Date, stepMinutes = 15): Date[] {
  const result: Date[] = [];
  let current = new Date(start);
  while (current <= end) {
    result.push(new Date(current));
    current = new Date(current.getTime() + stepMinutes * 60 * 1000);
  }
  return result;
}

/** Format a Date as "Mon, Mar 24" */
export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** Format a millisecond duration as "2h 14m" or "42m" or "now" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 1) return "now";
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Return true if two dates fall on the same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
