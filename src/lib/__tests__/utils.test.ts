import { describe, it, expect } from "vitest";
import {
  azimuthToCardinal,
  clamp,
  buildTimeRange,
  isSameDay,
  formatDuration,
  formatDeg,
  formatAltitude,
  formatDateLabel,
  formatTime,
} from "../utils";

describe("azimuthToCardinal", () => {
  it("should return N at 0°", () => {
    expect(azimuthToCardinal(0)).toBe("N");
  });

  it("should return N at 11.24° (just before NNE threshold)", () => {
    expect(azimuthToCardinal(11.24)).toBe("N");
  });

  it("should return NNE at 11.3° (at NNE threshold)", () => {
    expect(azimuthToCardinal(11.3)).toBe("NNE");
  });

  it("should return E at 90°", () => {
    expect(azimuthToCardinal(90)).toBe("E");
  });

  it("should return S at 180°", () => {
    expect(azimuthToCardinal(180)).toBe("S");
  });

  it("should return W at 270°", () => {
    expect(azimuthToCardinal(270)).toBe("W");
  });

  it("should return NNW at 337.5° (NNW start)", () => {
    expect(azimuthToCardinal(337.5)).toBe("NNW");
  });

  it("should return N at 348.75° (N start/NNW end boundary)", () => {
    expect(azimuthToCardinal(348.75)).toBe("N");
  });

  it("should return N at 360°", () => {
    expect(azimuthToCardinal(360)).toBe("N");
  });

  it("should handle negative input by normalizing to N", () => {
    // -10° wraps to 350°, which is N territory
    expect(azimuthToCardinal(-10)).toBe("N");
  });

  it("should handle large multiples (720°)", () => {
    expect(azimuthToCardinal(720)).toBe("N");
  });
});

describe("clamp", () => {
  it("should return value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("should return min when value is below range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("should return max when value is above range", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("buildTimeRange", () => {
  it("should create times with correct count and spacing", () => {
    const start = new Date("2026-07-14T00:00:00Z");
    const end = new Date("2026-07-14T01:00:00Z");
    const times = buildTimeRange(start, end, 15);

    // 00:00, 00:15, 00:30, 00:45, 01:00 = 5 points
    expect(times.length).toBe(5);
    expect(times[0].getTime()).toBe(start.getTime());
    expect(times[times.length - 1].getTime()).toBe(end.getTime());

    // Check spacing
    for (let i = 1; i < times.length; i++) {
      const diff = times[i].getTime() - times[i - 1].getTime();
      expect(diff).toBe(15 * 60 * 1000);
    }
  });

  it("should not include end point if not a multiple of step", () => {
    const start = new Date("2026-07-14T00:00:00Z");
    const end = new Date("2026-07-14T00:10:00Z");
    const times = buildTimeRange(start, end, 15);

    // Since 10 is not a multiple of 15, the loop will stop at 00:00 only
    // because 00:15 > 00:10, so the loop exits
    expect(times[0].getTime()).toBe(start.getTime());
    expect(times[times.length - 1].getTime()).toBeLessThan(end.getTime());
  });
});

describe("isSameDay", () => {
  it("should return true for same day", () => {
    const a = new Date("2026-07-14T08:00:00Z");
    const b = new Date("2026-07-14T20:00:00Z");
    expect(isSameDay(a, b)).toBe(true);
  });

  it("should return false across midnight", () => {
    const a = new Date("2026-07-14T23:00:00Z");
    const b = new Date("2026-07-15T01:00:00Z");
    expect(isSameDay(a, b)).toBe(false);
  });

  it("should return false for different days", () => {
    const a = new Date("2026-07-14T12:00:00Z");
    const b = new Date("2026-07-16T12:00:00Z");
    expect(isSameDay(a, b)).toBe(false);
  });
});

describe("formatDuration", () => {
  it("should return 'now' for < 30 seconds (rounds to 0)", () => {
    expect(formatDuration(0)).toBe("now");
    expect(formatDuration(29_000)).toBe("now");
  });

  it("should return minutes after rounding", () => {
    // 30000ms rounds to 1 minute
    expect(formatDuration(30_000)).toBe("1m");
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(59 * 60_000)).toBe("59m");
  });

  it("should return hours without minutes when exact", () => {
    expect(formatDuration(60 * 60_000)).toBe("1h");
    expect(formatDuration(2 * 60 * 60_000)).toBe("2h");
  });

  it("should return hours and minutes", () => {
    expect(formatDuration(135 * 60_000)).toBe("2h 15m");
    expect(formatDuration((2 * 60 + 30) * 60_000)).toBe("2h 30m");
  });
});

describe("formatDeg", () => {
  it("should format degrees with default 0 decimals", () => {
    expect(formatDeg(45)).toBe("45°");
    expect(formatDeg(45.7)).toBe("46°");
  });

  it("should format with specified decimals", () => {
    expect(formatDeg(45.678, 2)).toBe("45.68°");
    expect(formatDeg(45.678, 1)).toBe("45.7°");
  });
});

describe("formatAltitude", () => {
  it("should format positive altitude with + sign", () => {
    expect(formatAltitude(29)).toBe("+29°");
    expect(formatAltitude(0)).toBe("+0°");
  });

  it("should format negative altitude with − sign (U+2212)", () => {
    const result = formatAltitude(-12);
    expect(result).toContain("12°");
    expect(result.charCodeAt(0)).toBe(0x2212); // U+2212 minus
  });
});

describe("formatDateLabel", () => {
  it("should return non-empty string with date label", () => {
    const result = formatDateLabel(new Date("2026-07-14T12:00:00Z"));
    expect(result).toBeTruthy();
    expect(result).toMatch(/\w+,\s+\w+\s+\d+/);
  });
});

describe("formatTime", () => {
  it("should return non-empty string in 24h format", () => {
    const result = formatTime(new Date("2026-07-14T14:30:00Z"), true);
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d+:\d{2}/);
  });

  it("should return non-empty string in 12h format", () => {
    const result = formatTime(new Date("2026-07-14T14:30:00Z"), false);
    expect(result).toBeTruthy();
    expect(result).toMatch(/\d+:\d{2}/);
  });
});
