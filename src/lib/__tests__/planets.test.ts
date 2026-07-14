import { describe, it, expect } from "vitest";
import { getUpcomingConjunctions, PlanetName } from "../planets";
import { NYC } from "./fixtures";
import { azimuthToCardinal } from "../utils";

describe("getUpcomingConjunctions", () => {
  it("should return array of conjunctions", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const conjunctions = getUpcomingConjunctions(from, 30, NYC);

    expect(Array.isArray(conjunctions)).toBe(true);
  });

  it("should have valid separation angle for each conjunction", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const conjunctions = getUpcomingConjunctions(from, 30, NYC);

    for (const conj of conjunctions) {
      expect(conj.separationDeg).toBeGreaterThan(0);
      expect(conj.separationDeg).toBeLessThan(5);
    }
  });

  it("should have valid planet names", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const conjunctions = getUpcomingConjunctions(from, 30, NYC);

    const validPlanets: PlanetName[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

    for (const conj of conjunctions) {
      expect(validPlanets).toContain(conj.planet);
    }
  });

  it("should return results sorted by date ascending", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const conjunctions = getUpcomingConjunctions(from, 30, NYC);

    for (let i = 1; i < conjunctions.length; i++) {
      expect(conjunctions[i].date.getTime()).toBeGreaterThanOrEqual(conjunctions[i - 1].date.getTime());
    }
  });

  it("should have cardinal consistent with moon azimuth", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const conjunctions = getUpcomingConjunctions(from, 30, NYC);

    for (const conj of conjunctions) {
      const expectedCardinal = azimuthToCardinal(conj.moonAzimuthDeg);
      expect(conj.cardinal).toBe(expectedCardinal);
    }
  });

  it("should have isNightVisible as boolean", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const conjunctions = getUpcomingConjunctions(from, 30, NYC);

    for (const conj of conjunctions) {
      expect(typeof conj.isNightVisible).toBe("boolean");
    }
  });

  it("should have dates within scan window (±1 day slack)", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const days = 30;
    const conjunctions = getUpcomingConjunctions(from, days, NYC);

    for (const conj of conjunctions) {
      const diffMs = conj.date.getTime() - from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeGreaterThanOrEqual(-1);
      expect(diffDays).toBeLessThanOrEqual(days + 1);
    }
  });

  it("should be deterministic", () => {
    const from = new Date("2026-07-14T00:00:00Z");
    const conj1 = getUpcomingConjunctions(from, 30, NYC);
    const conj2 = getUpcomingConjunctions(from, 30, NYC);

    expect(conj1.length).toBe(conj2.length);
    for (let i = 0; i < conj1.length; i++) {
      expect(conj1[i].date.getTime()).toBe(conj2[i].date.getTime());
      expect(conj1[i].planet).toBe(conj2[i].planet);
      expect(conj1[i].separationDeg).toBe(conj2[i].separationDeg);
      expect(conj1[i].moonAltitudeDeg).toBe(conj2[i].moonAltitudeDeg);
      expect(conj1[i].moonAzimuthDeg).toBe(conj2[i].moonAzimuthDeg);
    }
  });
});
