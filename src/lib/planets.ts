import * as Astronomy from "astronomy-engine";
import SunCalc from "suncalc";
import { Location } from "./moon";
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

function radToDeg(r: number): number {
  return (r * 180) / Math.PI;
}

function suncalcAzimuthToCompass(az: number): number {
  return ((radToDeg(az) + 180) % 360 + 360) % 360;
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
  const moonPos = SunCalc.getMoonPosition(time, loc.lat, loc.lng);
  const altDeg = (moonPos.altitude * 180) / Math.PI;
  const azDeg = (((moonPos.azimuth * 180) / Math.PI) + 180 + 360) % 360;

  const sunPos = SunCalc.getSunPosition(time, loc.lat, loc.lng);
  const sunAltDeg = (sunPos.altitude * 180) / Math.PI;

  return {
    date: time,
    planet,
    separationDeg: Math.round(sep * 10) / 10,
    moonAltitudeDeg: Math.round(altDeg * 10) / 10,
    moonAzimuthDeg: Math.round(azDeg * 10) / 10,
    cardinal: azimuthToCardinal(azDeg),
    isNightVisible: altDeg > 5 && sunAltDeg < -6,
  };
}
