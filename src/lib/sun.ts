import * as Astronomy from "astronomy-engine";
import { Location, getMoonPosition, getMoonTimes, getMoonPhase } from "./moon";

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  goldenHourMorningEnd: Date | null;
  goldenHourEveningStart: Date | null;
  solarNoon: Date | null;
  dusk: Date | null;
  dawn: Date | null;
}

export interface SkyEvent {
  time: Date;
  label: string;
  detail: string;
  type: "moonrise-sunset" | "moonrise-golden" | "moonset-sunrise" | "crescent-twilight" | "moon-daylight";
}

/** Sun events within the local calendar day containing `date` */
export function getSunTimes(date: Date, loc: Location): SunTimes {
  const obs = new Astronomy.Observer(loc.lat, loc.lng, 0);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const Sun = Astronomy.Body.Sun;

  const time = (t: { date: Date } | null): Date | null => (t ? t.date : null);
  // SearchAltitude: sun center crossing the given altitude (deg), rising (+1) or setting (-1)
  const atAlt = (direction: 1 | -1, altitudeDeg: number): Date | null =>
    time(Astronomy.SearchAltitude(Sun, obs, direction, dayStart, 1, altitudeDeg));

  let solarNoon: Date | null = null;
  try {
    solarNoon = Astronomy.SearchHourAngle(Sun, obs, 0, dayStart).time.date;
  } catch {
    solarNoon = null;
  }

  return {
    sunrise: time(Astronomy.SearchRiseSet(Sun, obs, +1, dayStart, 1)),
    sunset:  time(Astronomy.SearchRiseSet(Sun, obs, -1, dayStart, 1)),
    goldenHourMorningEnd:   atAlt(+1, 6),  // sun climbs past 6°
    goldenHourEveningStart: atAlt(-1, 6),  // sun drops below 6°
    solarNoon,
    dawn: atAlt(+1, -6), // civil twilight start
    dusk: atAlt(-1, -6), // civil twilight end
  };
}

function minsApart(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60_000;
}

export function getSkyEvents(date: Date, loc: Location): SkyEvent[] {
  const sun = getSunTimes(date, loc);
  const moon = getMoonTimes(date, loc);
  const phase = getMoonPhase(date);
  const events: SkyEvent[] = [];

  // 1. Moonrise within 30 min of sunset (opposition on horizon — most dramatic for full/near-full)
  if (moon.rise && sun.sunset && minsApart(moon.rise, sun.sunset) <= 30) {
    const isNearFull = phase.fraction >= 0.85;
    events.push({
      time: moon.rise,
      type: "moonrise-sunset",
      label: isNearFull ? "Full moon rises as sun sets" : "Moon rises near sunset",
      detail: isNearFull
        ? "Moon and sun on opposite horizons — the most dramatic pairing"
        : "Moon rises within 30 min of sunset",
    });
  }

  // 2. Moonrise during evening golden hour window
  if (
    moon.rise &&
    sun.goldenHourEveningStart &&
    sun.sunset &&
    moon.rise >= sun.goldenHourEveningStart &&
    moon.rise <= sun.sunset
  ) {
    // Avoid double-reporting with the moonrise-sunset event
    if (!events.some((e) => e.type === "moonrise-sunset")) {
      events.push({
        time: moon.rise,
        type: "moonrise-golden",
        label: "Moonrise during golden hour",
        detail: "Moon rises while warm light fills the sky — ideal for photography",
      });
    }
  }

  // 3. Moonset within 30 min of sunrise
  if (moon.set && sun.sunrise && minsApart(moon.set, sun.sunrise) <= 30) {
    events.push({
      time: moon.set,
      type: "moonset-sunrise",
      label: "Moon sets as sun rises",
      detail: "Moon descends on the western horizon as dawn breaks in the east",
    });
  }

  // 4. Crescent moon visible in evening twilight (after sunset, before dusk)
  if (sun.sunset && sun.dusk && phase.fraction < 0.25 && phase.phase < 0.5) {
    const twilightMid = new Date((sun.sunset.getTime() + sun.dusk.getTime()) / 2);
    const moonPos = getMoonPosition(twilightMid, loc);
    if (moonPos.altitudeDeg > 5) {
      events.push({
        time: sun.sunset,
        type: "crescent-twilight",
        label: "Young crescent moon in evening sky",
        detail: `${phase.emoji} ${Math.round(phase.fraction * 100)}% lit — look ${moonPos.cardinal} just after sunset`,
      });
    }
  }

  // 5. Moon visible at solar noon (daytime moon)
  if (sun.solarNoon) {
    const noonPos = getMoonPosition(sun.solarNoon, loc);
    if (noonPos.altitudeDeg > 15) {
      events.push({
        time: sun.solarNoon,
        type: "moon-daylight",
        label: "Moon visible in daytime sky",
        detail: `${Math.round(noonPos.altitudeDeg)}° above horizon at solar noon — ${noonPos.cardinal}`,
      });
    }
  }

  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
}
