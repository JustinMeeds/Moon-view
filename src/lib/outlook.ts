/**
 * 7-day fishing outlook.
 * For each of the next 7 calendar days, computes a peak fishing score
 * using the hourly weather forecast + solunar windows for that day.
 */
import { calculateFishingScore } from "./score";
import { getSolunarWindows } from "./solunar";
import { getMoonPhase } from "./moon";
import type { HourlyPoint } from "./weather";
import type { Location } from "./moon";

export interface DayOutlook {
  date: Date;
  /** Short day name: "Mon", "Tue", … or "Today" */
  dayName: string;
  /** Peak score 1–10 for the day */
  peakScore: number;
  /** Hour with the peak score */
  peakHour: Date | null;
  /** Representative weather code for display (most common daytime code) */
  weatherCode: number;
}

function getDayName(date: Date, today: Date): string {
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return "Today";
  }
  return date.toLocaleDateString("en-CA", { weekday: "short" });
}

function mostCommonCode(codes: number[]): number {
  if (!codes.length) return 0;
  const freq: Record<number, number> = {};
  for (const c of codes) freq[c] = (freq[c] ?? 0) + 1;
  return Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
}

export function getDailyOutlook(
  hourly: HourlyPoint[],
  location: Location,
  today: Date
): DayOutlook[] {
  const days: DayOutlook[] = [];

  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() + d);
    dayDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(dayDate);
    nextDay.setDate(dayDate.getDate() + 1);

    // Filter hourly entries for this calendar day
    const dayHourly = hourly.filter(
      (h) => h.time >= dayDate.getTime() && h.time < nextDay.getTime()
    );

    if (!dayHourly.length) continue;

    // Compute solunar windows for the day (once per day)
    const noonOfDay = new Date(dayDate);
    noonOfDay.setHours(12, 0, 0, 0);
    const windows = getSolunarWindows(noonOfDay, location);
    const moonPhase = getMoonPhase(noonOfDay);

    let peakScore = 1;
    let peakHour: Date | null = null;

    for (const h of dayHourly) {
      // Only consider fishing hours: 5 AM – 10 PM
      const hour = new Date(h.time).getHours();
      if (hour < 5 || hour > 22) continue;

      const idx = hourly.indexOf(h);
      const prev3 = idx >= 3 ? hourly[idx - 3].pressureHpa : h.pressureHpa;

      const result = calculateFishingScore({
        pressureNow: h.pressureHpa,
        pressure3hAgo: prev3,
        windKmh: h.windKmh,
        airTempC: h.airTempC,
        monthIndex: dayDate.getMonth(),
        solunarWindows: windows,
        moonFraction: moonPhase.fraction,
        now: new Date(h.time),
        lat: location.lat,
      });

      if (result.total > peakScore) {
        peakScore = result.total;
        peakHour = new Date(h.time);
      }
    }

    // Representative weather code: most common between 7 AM and 7 PM
    const daytimeCodes = dayHourly
      .filter((h) => {
        const hr = new Date(h.time).getHours();
        return hr >= 7 && hr <= 19;
      })
      .map((h) => h.weatherCode);

    days.push({
      date: dayDate,
      dayName: getDayName(dayDate, today),
      peakScore,
      peakHour,
      weatherCode: mostCommonCode(daytimeCodes),
    });
  }

  return days;
}
