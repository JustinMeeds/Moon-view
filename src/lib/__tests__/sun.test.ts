import { describe, it, expect } from "vitest";
import { getSunTimes, getSkyEvents } from "../sun";
import { NYC, SYD, REY, RISE_SET, TOL } from "./fixtures";

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

describe("getSunTimes", () => {
  it("should match rise/set times from fixtures within tolerance", () => {
    for (const fixture of RISE_SET) {
      const date = new Date(`${fixture.date}T12:00:00Z`); // Use midday to ensure we get the right day's times
      const times = getSunTimes(date, fixture.loc);

      if (fixture.sunriseUT && times.sunrise) {
        const expectedRise = getClosestTimeMatch(times.sunrise, fixture.sunriseUT);
        const diffMinutes = Math.abs(times.sunrise.getTime() - expectedRise.getTime()) / 60_000;
        expect(diffMinutes).toBeLessThanOrEqual(TOL.sunRiseSetMinutes);
      }

      if (fixture.sunsetUT && times.sunset) {
        const expectedSet = getClosestTimeMatch(times.sunset, fixture.sunsetUT);
        const diffMinutes = Math.abs(times.sunset.getTime() - expectedSet.getTime()) / 60_000;
        expect(diffMinutes).toBeLessThanOrEqual(TOL.sunRiseSetMinutes);
      }
    }
  });

  // getSunTimes returns events within the calendar day of the runtime timezone.
  // Ordering (sunrise < noon < sunset) only holds when the runtime tz roughly
  // matches the location's solar day — true for Reykjavik under TZ=UTC, not NYC.
  it("should have sunrise < sunset (tz-aligned location)", () => {
    const date = new Date("2026-01-05T00:00:00Z");
    const times = getSunTimes(date, REY);

    expect(times.sunrise).not.toBeNull();
    expect(times.sunset).not.toBeNull();
    expect(times.sunrise!.getTime()).toBeLessThan(times.sunset!.getTime());
  });

  it("should have solarNoon between sunrise and sunset (tz-aligned location)", () => {
    const date = new Date("2026-01-05T00:00:00Z");
    const times = getSunTimes(date, REY);

    expect(times.solarNoon).not.toBeNull();
    expect(times.solarNoon!.getTime()).toBeGreaterThan(times.sunrise!.getTime());
    expect(times.solarNoon!.getTime()).toBeLessThan(times.sunset!.getTime());
  });

  it("should have dawn <= sunrise and sunset <= dusk", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const times = getSunTimes(date, NYC);

    if (times.dawn && times.sunrise) {
      expect(times.dawn.getTime()).toBeLessThanOrEqual(times.sunrise.getTime());
    }

    if (times.sunset && times.dusk) {
      expect(times.sunset.getTime()).toBeLessThanOrEqual(times.dusk.getTime());
    }
  });
});

describe("getSkyEvents", () => {
  it("should return events for NYC on 2026-07-14", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const events = getSkyEvents(date, NYC);

    expect(Array.isArray(events)).toBe(true);
  });

  it("should return events for SYD on 2026-07-14", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const events = getSkyEvents(date, SYD);

    expect(Array.isArray(events)).toBe(true);
  });

  it("should return events sorted by time ascending", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const events = getSkyEvents(date, NYC);

    for (let i = 1; i < events.length; i++) {
      expect(events[i].time.getTime()).toBeGreaterThanOrEqual(events[i - 1].time.getTime());
    }
  });

  it("should have non-empty label and detail for each event", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const events = getSkyEvents(date, NYC);

    for (const event of events) {
      expect(event.label).toBeTruthy();
      expect(event.detail).toBeTruthy();
      expect(typeof event.label).toBe("string");
      expect(typeof event.detail).toBe("string");
    }
  });

  it("should have valid event types", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const events = getSkyEvents(date, NYC);

    const validTypes = [
      "moonrise-sunset",
      "moonrise-golden",
      "moonset-sunrise",
      "crescent-twilight",
      "moon-daylight",
    ];

    for (const event of events) {
      expect(validTypes).toContain(event.type);
    }
  });

  it("should not have conflicting duplicate event types", () => {
    const date = new Date("2026-07-14T00:00:00Z");
    const events = getSkyEvents(date, NYC);

    // Check that moonrise-sunset and moonrise-golden don't both exist
    const types = events.map((e) => e.type);
    const hasMoonriseSunset = types.includes("moonrise-sunset");
    const hasMoonriseGolden = types.includes("moonrise-golden");

    if (hasMoonriseSunset) {
      expect(hasMoonriseGolden).toBe(false);
    }
  });
});
