import * as Astronomy from "astronomy-engine";
import { Location, getMoonPosition } from "./moon";
import { azimuthToCardinal } from "./utils";

export type PlanetName = "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

export interface PlanetConjunction {
  date: Date;
  planet: PlanetName;
  separationDeg: number;
  moonAltitudeDeg: number;
  moonAzimuthDeg: number;
  cardinal: string;
  isNightVisible: boolean;
}

export const PLANET_META: Record<PlanetName, { symbol: string; color: string }> = {
  Mercury: { symbol: "☿", color: "text-orange-300" },
  Venus:   { symbol: "♀", color: "text-yellow-100" },
  Mars:    { symbol: "♂", color: "text-red-400" },
  Jupiter: { symbol: "♃", color: "text-amber-300" },
  Saturn:  { symbol: "♄", color: "text-yellow-400" },
};

const PLANETS: PlanetName[] = ["Venus", "Mars", "Jupiter", "Saturn", "Mercury"];

/** Hex colors for SVG rendering (PLANET_META has Tailwind classes for text UI) */
export const BODY_HEX: Record<PlanetName | "Sun", string> = {
  Mercury: "#fdba74",
  Venus:   "#fef9c3",
  Mars:    "#f87171",
  Jupiter: "#fcd34d",
  Saturn:  "#facc15",
  Sun:     "#fde047",
};

export interface SkyBody {
  name: PlanetName | "Sun";
  symbol: string;
  colorHex: string;
  azimuthDeg: number;
  altitudeDeg: number;
  cardinal: string;
  /** Apparent visual magnitude — lower is brighter (Venus ≈ −4, Saturn ≈ +1) */
  magnitude: number;
  isUp: boolean;
}

function bodyAltAz(body: Astronomy.Body, date: Date, obs: Astronomy.Observer) {
  const eq = Astronomy.Equator(body, date, obs, true, true);
  return Astronomy.Horizon(date, obs, eq.ra, eq.dec);
}

/** Topocentric positions of the five naked-eye planets + Sun at an instant */
export function getSkyBodies(date: Date, loc: Location): SkyBody[] {
  const obs = new Astronomy.Observer(loc.lat, loc.lng, 0);
  const bodies: SkyBody[] = [];

  const push = (name: PlanetName | "Sun", body: Astronomy.Body) => {
    try {
      const hor = bodyAltAz(body, date, obs);
      let magnitude = -26.7; // Sun
      if (name !== "Sun") {
        magnitude = Astronomy.Illumination(body, date).mag;
      }
      bodies.push({
        name,
        symbol: name === "Sun" ? "☉" : PLANET_META[name].symbol,
        colorHex: BODY_HEX[name],
        azimuthDeg: hor.azimuth,
        altitudeDeg: hor.altitude,
        cardinal: azimuthToCardinal(hor.azimuth),
        magnitude,
        isUp: hor.altitude > 0,
      });
    } catch {
      // skip body on ephemeris failure
    }
  };

  push("Sun", Astronomy.Body.Sun);
  for (const p of PLANETS) push(p, p as Astronomy.Body);
  return bodies;
}

/**
 * Best moment to actually see a conjunction near its minimum-separation
 * instant: moon up while the sky is at least twilight-dark, scanning ±12 h
 * in 30-min steps. Crescent-moon conjunctions often exist ONLY in twilight
 * (a young moon sets with the sun), so darkness is scored, not required.
 * Falls back to the instant itself when the pair is never up in a dark sky.
 */
export function bestViewingMoment(around: Date, loc: Location): Date {
  const obs = new Astronomy.Observer(loc.lat, loc.lng, 0);
  const STEP_MS = 15 * 60_000;
  const STEPS = 48; // ±12 h

  const scan = (minMoonAlt: number, maxSunAlt: number): Date | null => {
    let best: { time: Date; score: number } | null = null;
    for (let i = -STEPS; i <= STEPS; i++) {
      const t = new Date(around.getTime() + i * STEP_MS);
      const moon = bodyAltAz(Astronomy.Body.Moon, t, obs);
      if (moon.altitude <= minMoonAlt) continue;
      const sun = bodyAltAz(Astronomy.Body.Sun, t, obs);
      if (sun.altitude >= maxSunAlt) continue;
      const darkness = Math.min(-sun.altitude, 18);
      const score = moon.altitude + darkness - Math.abs(i) * 0.05;
      if (!best || score > best.score) best = { time: t, score };
    }
    return best?.time ?? null;
  };

  // Properly dark sky first; young-crescent conjunctions may only exist in
  // twilight, so fall back to a relaxed pass before giving up
  return scan(3, -6) ?? scan(0.5, -1) ?? around;
}

export function getUpcomingConjunctions(
  from: Date,
  days: number,
  loc: Location
): PlanetConjunction[] {
  const STEP_HOURS = 6;
  const CONJUNCTION_DEG = 5;
  const results: PlanetConjunction[] = [];

  // Track candidate conjunctions per planet: { planet, minSep, bestTime }
  const candidates = new Map<PlanetName, { sep: number; time: Date }>();

  const totalSteps = (days * 24) / STEP_HOURS;
  for (let i = 0; i <= totalSteps; i++) {
    const t = new Date(from.getTime() + i * STEP_HOURS * 3_600_000);

    let moonVec: Astronomy.Vector;
    try {
      moonVec = Astronomy.GeoVector("Moon" as Astronomy.Body, t, true);
    } catch {
      continue;
    }

    for (const planet of PLANETS) {
      let planetVec: Astronomy.Vector;
      try {
        planetVec = Astronomy.GeoVector(planet as Astronomy.Body, t, true);
      } catch {
        continue;
      }

      const sep = Astronomy.AngleBetween(moonVec, planetVec);
      if (sep < CONJUNCTION_DEG) {
        const prev = candidates.get(planet);
        if (!prev || sep < prev.sep) {
          candidates.set(planet, { sep, time: t });
        }
      } else if (candidates.has(planet)) {
        // Separation started increasing — flush candidate
        const c = candidates.get(planet)!;
        candidates.delete(planet);
        results.push(buildConjunction(planet, c.time, c.sep, loc));
      }
    }
  }

  // Flush any still-open candidates at end of scan window
  for (const [planet, c] of candidates) {
    results.push(buildConjunction(planet, c.time, c.sep, loc));
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function buildConjunction(
  planet: PlanetName,
  time: Date,
  sep: number,
  loc: Location
): PlanetConjunction {
  const moonPos = getMoonPosition(time, loc);

  const obs = new Astronomy.Observer(loc.lat, loc.lng, 0);
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, time, obs, true, true);
  const sunAltDeg = Astronomy.Horizon(time, obs, sunEq.ra, sunEq.dec).altitude;

  return {
    date: time,
    planet,
    separationDeg: Math.round(sep * 10) / 10,
    moonAltitudeDeg: Math.round(moonPos.altitudeDeg * 10) / 10,
    moonAzimuthDeg: Math.round(moonPos.azimuthDeg * 10) / 10,
    cardinal: azimuthToCardinal(moonPos.azimuthDeg),
    isNightVisible: moonPos.altitudeDeg > 5 && sunAltDeg < -6,
  };
}
