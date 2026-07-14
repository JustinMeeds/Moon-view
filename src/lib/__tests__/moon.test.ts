import { describe, it, expect } from "vitest";
import {
  getMoonPosition,
  getMoonPhase,
  getMoonTimes,
  getLunarDistance,
  buildNightChart,
  findDatesForAzimuth,
} from "../moon";
import {
  NYC,
  RISE_SET,
  MOON_POSITIONS,
  PHASE_INSTANTS,
  ILLUMINATION,
  TOL,
  PERIGEE_RANGE_KM,
} from "./fixtures";
import { azimuthToCardinal } from "../utils";

// Helper: compare azimuths with 360° wraparound
function azimuthDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 360 - diff);
}

// Helper: match HH:MM time regardless of date (for fixtures that cross midnight)
// Compares only the time portion, allowing ±1 day tolerance
function getClosestTimeMatch(targetTime: Date, timeStr: string): Date {
  const [hh, mm] = timeStr.split(":").map(Number);

  // Try three dates: targetTime - 1 day, targetTime date, targetTime + 1 day
  const dates = [
    new Date(targetTime.getTime() - 24 * 60 * 60 * 1000),
    new Date(targetTime.getTime()),
    new Date(targetTime.getTime() + 24 * 60 * 60 * 1000),
  ];

  let closest = dates[0];
  let minDiff = Infinity;

  for (const d of dates) {
    const candidate = new Date(d);
    candidate.setUTCHours(hh, mm, 0, 0); // Use UTC to match fixture times
    const diff = Math.abs(candidate.getTime() - targetTime.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidate;
    }
  }

  return closest;
}

describe("getMoonPosition", () => {
  it("should match fixture positions within tolerance", () => {
    for (const fixture of MOON_POSITIONS) {
      const date = new Date(fixture.iso);
      const pos = getMoonPosition(date, fixture.loc);

      expect(Math.abs(pos.altitudeDeg - fixture.altitudeDeg)).toBeLessThanOrEqual(TOL.altitudeDeg);
      expect(azimuthDiff(pos.azimuthDeg, fixture.azimuthDeg)).toBeLessThanOrEqual(TOL.azimuthDeg);
      expect(Math.abs(pos.distanceKm - fixture.geoDistanceKm)).toBeLessThanOrEqual(TOL.distanceKm);
      expect(pos.isVisible).toBe(true); // Both fixtures are above horizon
      expect(pos.cardinal).toBe(azimuthToCardinal(pos.azimuthDeg));
    }
  });
});

describe("getMoonPhase", () => {
  it("should match phase instants within tolerance", () => {
    for (const fixture of PHASE_INSTANTS) {
      const date = new Date(fixture.iso);
      const phase = getMoonPhase(date);

      // Handle wraparound at 0/1 for New Moon
      const phaseDiff = Math.min(
        Math.abs(phase.phase - fixture.phase),
        1 - Math.abs(phase.phase - fixture.phase)
      );
      expect(phaseDiff).toBeLessThanOrEqual(TOL.phaseCycle);

      // Fraction should be within range
      expect(phase.fraction).toBeGreaterThanOrEqual(fixture.minFraction);
      expect(phase.fraction).toBeLessThanOrEqual(fixture.maxFraction);

      // Label should match fixture name
      expect(phase.label).toBe(fixture.name);
    }
  });

  it("should match illumination fixture", () => {
    for (const fixture of ILLUMINATION) {
      const date = new Date(fixture.iso);
      const phase = getMoonPhase(date);

      expect(Math.abs(phase.fraction - fixture.fraction)).toBeLessThanOrEqual(fixture.tolerance);
    }
  });
});

describe("getMoonTimes", () => {
  it("should match rise/set times within tolerance", () => {
    for (const fixture of RISE_SET) {
      const date = new Date(`${fixture.date}T12:00:00Z`); // Use midday to ensure we get the right day's times
      const times = getMoonTimes(date, fixture.loc);

      if (fixture.moonriseUT && times.rise) {
        const expectedRise = getClosestTimeMatch(times.rise, fixture.moonriseUT);
        const diffMinutes = Math.abs(times.rise.getTime() - expectedRise.getTime()) / 60_000;
        expect(diffMinutes).toBeLessThanOrEqual(TOL.moonRiseSetMinutes);
      }

      if (fixture.moonsetUT && times.set) {
        const expectedSet = getClosestTimeMatch(times.set, fixture.moonsetUT);
        const diffMinutes = Math.abs(times.set.getTime() - expectedSet.getTime()) / 60_000;
        expect(diffMinutes).toBeLessThanOrEqual(TOL.moonRiseSetMinutes);
      }
    }
  });
});

describe("getLunarDistance", () => {
  it("should have valid distance range", () => {
    const date = new Date("2026-07-14T12:00:00Z");
    const dist = getLunarDistance(date, NYC);

    expect(dist.distanceKm).toBeGreaterThanOrEqual(PERIGEE_RANGE_KM.min - 1000);
    expect(dist.distanceKm).toBeLessThanOrEqual(406_700 + 1000);
  });

  it("should have percentClose in [0, 100]", () => {
    const date = new Date("2026-07-14T12:00:00Z");
    const dist = getLunarDistance(date, NYC);

    expect(dist.percentClose).toBeGreaterThanOrEqual(0);
    expect(dist.percentClose).toBeLessThanOrEqual(100);
  });

  it("should have valid perigee data if present", () => {
    const date = new Date("2026-07-14T12:00:00Z");
    const dist = getLunarDistance(date, NYC);

    if (dist.nextPerigee) {
      expect(dist.nextPerigee.getTime()).toBeGreaterThan(date.getTime());
      const daysUntilPerigee = (dist.nextPerigee.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysUntilPerigee).toBeLessThanOrEqual(35);
    }

    if (dist.nextPerigeeKm) {
      expect(dist.nextPerigeeKm).toBeGreaterThanOrEqual(PERIGEE_RANGE_KM.min);
      expect(dist.nextPerigeeKm).toBeLessThanOrEqual(PERIGEE_RANGE_KM.max);
    }
  });
});

describe("buildNightChart", () => {
  it("should span midnight to midnight with 15-min steps", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const chart = buildNightChart(date, NYC, 15);

    // 24 hours * 60 min / 15 min = 96 intervals, 97 points (inclusive of both ends)
    expect(chart.chartPoints.length).toBe(97);

    // First point should be at midnight
    expect(chart.chartPoints[0].time.getHours()).toBe(0);
    expect(chart.chartPoints[0].time.getMinutes()).toBe(0);

    // Last point should be at next midnight
    const lastPoint = chart.chartPoints[chart.chartPoints.length - 1];
    expect(lastPoint.time.getHours()).toBe(0);
    expect(lastPoint.time.getMinutes()).toBe(0);
    expect(lastPoint.time.getDate()).toBe(date.getDate() + 1);
  });

  it("should have strictly increasing timestamps", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const chart = buildNightChart(date, NYC, 15);

    for (let i = 1; i < chart.chartPoints.length; i++) {
      expect(chart.chartPoints[i].timestamp).toBeGreaterThan(chart.chartPoints[i - 1].timestamp);
    }
  });

  it("should have altitudes in [-90, 90] and valid properties", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const chart = buildNightChart(date, NYC, 15);

    for (const point of chart.chartPoints) {
      expect(point.altitudeDeg).toBeGreaterThanOrEqual(-90);
      expect(point.altitudeDeg).toBeLessThanOrEqual(90);
      expect(typeof point.cardinal).toBe("string");
      expect(typeof point.isVisible).toBe("boolean");
      expect(point.isVisible).toBe(point.altitudeDeg > 0);
    }
  });

  it("should identify peak as max altitude point", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const chart = buildNightChart(date, NYC, 15);

    if (chart.peak) {
      for (const point of chart.chartPoints) {
        expect(point.altitudeDeg).toBeLessThanOrEqual(chart.peak.altitudeDeg);
      }
    }
  });

  it("should have valid best viewing window", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const chart = buildNightChart(date, NYC, 15);

    if (chart.bestWindowStart && chart.bestWindowEnd) {
      expect(chart.bestWindowStart.getTime()).toBeLessThanOrEqual(chart.bestWindowEnd.getTime());

      // Every point in the window should be visible
      for (const point of chart.chartPoints) {
        if (
          point.time.getTime() >= chart.bestWindowStart.getTime() &&
          point.time.getTime() <= chart.bestWindowEnd.getTime()
        ) {
          expect(point.isVisible).toBe(true);
        }
      }
    }
  });
});

describe("findDatesForAzimuth", () => {
  it("should find matches within tolerance", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const targetAz = 90; // East
    const matches = findDatesForAzimuth(targetAz, from, 30, NYC);

    for (const match of matches) {
      expect(match.deltaDeg).toBeLessThanOrEqual(4); // default tolerance
      expect(["rise", "set"]).toContain(match.type);
      expect(match.date instanceof Date).toBe(true);
      expect(match.time instanceof Date).toBe(true);
    }
  });

  it("should return results sorted by date", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const matches = findDatesForAzimuth(90, from, 30, NYC);

    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].date.getTime()).toBeGreaterThanOrEqual(matches[i - 1].date.getTime());
    }
  });

  it("should respect custom tolerance", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const tolerance = 2;
    const matches = findDatesForAzimuth(90, from, 30, NYC, tolerance);

    for (const match of matches) {
      expect(match.deltaDeg).toBeLessThanOrEqual(tolerance);
    }
  });

  it("should respect scan window", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const days = 30;
    const matches = findDatesForAzimuth(90, from, days, NYC);

    for (const match of matches) {
      const diffDays = (match.date.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      // Allow 1 day slack as per spec
      expect(diffDays).toBeGreaterThanOrEqual(-1);
      expect(diffDays).toBeLessThanOrEqual(days + 1);
    }
  });
});
