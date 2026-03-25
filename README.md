# CastON — Ontario Fishing Companion

A fishing companion PWA for Ontario anglers. Real-time conditions intelligence — solunar windows, barometric pressure trends, water temperature — combined with Ontario-specific fishing regulations and species information. Offline-capable and installable on iPhone and Android.

---

## Features

| Screen | What it does |
|--------|-------------|
| **Home** | Fishing score (1–10) with per-factor breakdown, hourly day timeline, 7-day weekly outlook |
| **Moon** | Full solunar detail, moon phase, rise/set, altitude chart, 7-day phase strip |
| **Conditions** | Weather, barometric pressure sparkline, ECCC water temperature, 12h forecast |
| **Regulations** | FMZ detection, season status, size/possession limits for 50+ Ontario species × 20 zones |
| **Species** | Habitat, seasonal feeding behaviour, season-aware techniques for key Ontario species |

**Fishing Score algorithm:** 5 weighted factors — barometric pressure trend (35%), solunar windows (25%), wind (20%), air temp vs. seasonal norm (15%), moon phase (5%).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Radix UI primitives |
| Moon/solunar | SunCalc (client-side, no API key) |
| Charts | Recharts |
| Geospatial | @turf/boolean-point-in-polygon, topojson-client |
| Caching | idb-keyval (IndexedDB) |
| PWA | next-pwa (service worker, offline caching) |
| Weather API | Open-Meteo (free, no API key) |
| Water temp | ECCC Hydrometric API (free, proxied) |
| Remote data | Supabase Storage (optional — for regulation updates) |

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/justinmeeds/caston.git
cd caston
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Supabase is **optional** — the app works fully without it (bundled regulations are used):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Supabase Setup (Optional)

Supabase is only needed if you want to push regulation updates to users without a full app redeploy. Auth and database tables are not used in v1.

### 1. Create a project

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `caston`, choose the closest region
3. Copy your **Project URL** and **anon key** from Settings → API

### 2. Create a public Storage bucket

1. In the Supabase dashboard → Storage → New bucket
2. Name: `data`
3. Set **Public** = ✅
4. No other settings needed

### 3. Upload the regulations file

1. In the `data` bucket → Upload file
2. Upload `public/data/regulations-2025.json` **renamed to `regulations.json`**
3. Confirm the public URL: `https://<project-ref>.supabase.co/storage/v1/object/public/data/regulations.json`

### 4. Set environment variables

In `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

The app will now silently check for a newer `regulations.json` on each launch and update the local cache if the `version` field is newer.

---

## Deploy to Vercel

### One-click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars (only needed if using Supabase for remote regulation updates)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

The app deploys and functions fully without Supabase env vars set — bundled regulations are used.

---

## Install as PWA

### iPhone (Safari)
1. Open the deployed URL in Safari
2. Tap the **Share** button → **Add to Home Screen**
3. Tap **Add**

### Android (Chrome)
1. Open the deployed URL in Chrome
2. Tap the menu → **Add to Home Screen** (or the install prompt)

---

## Offline Behaviour

| Feature | Offline source |
|---------|--------------|
| Moon & solunar data | SunCalc (client-side — always works) |
| Fishing score | Cached weather + SunCalc |
| Pressure trend chart | Cached Open-Meteo response |
| Regulations (current zone) | Bundled JSON — always available |
| Species info | Compiled into app bundle |
| FMZ detection (GPS) | Bundled low-res GeoJSON |
| FMZ map picker | Static map — always available |

When weather data is stale (>2h old), a non-blocking banner is shown with a refresh button.

---

## Data Sources

| Source | Used for | API key |
|--------|----------|---------|
| [Open-Meteo](https://open-meteo.com) | 7-day weather forecast, pressure, wind, humidity | None |
| [ECCC Hydrometric](https://wateroffice.ec.gc.ca) | Water temperature (via `/api/watertemp` proxy route) | None |
| [SunCalc](https://github.com/mourner/suncalc) | Moon phase, rise/set, position, solunar windows | None (client-side) |
| [OpenStreetMap Nominatim](https://nominatim.org) | Geocoding (city name → lat/lon) | None |
| Supabase Storage | Remote regulations JSON updates | Optional |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — AppProvider, BottomNav, SW registrar
│   ├── page.tsx                # Home — score, breakdown, day timeline, week outlook
│   ├── moon/page.tsx           # Moon — solunar, phase, altitude chart
│   ├── tonight/page.tsx        # Tonight — altitude scrubber (6 PM – 6 AM)
│   ├── conditions/page.tsx     # Conditions — weather, pressure, water temp
│   ├── regulations/page.tsx    # Regulations — species × FMZ lookup
│   ├── regulations/[species]/  # Species regulation detail
│   ├── species/page.tsx        # Species list
│   ├── species/[id]/page.tsx   # Species detail — habitat, feeding, techniques
│   ├── settings/page.tsx       # Settings — location, preferences
│   └── api/watertemp/route.ts  # ECCC proxy (bypasses CORS)
├── components/
│   ├── ui/                     # Button, Card, Input, Badge (Radix primitives)
│   ├── FishingScore.tsx        # Score display — numeral, reason, best-today
│   ├── ScoreBreakdown.tsx      # 5-factor "Why?" breakdown with mini bars
│   ├── DayTimeline.tsx         # Hourly score bar chart for today (5 AM – 10 PM)
│   ├── WeekOutlook.tsx         # 7-day daily score strip
│   ├── SolunarChart.tsx        # Feeding windows list with countdowns
│   ├── MoonChart.tsx           # Recharts altitude chart + scrubber
│   ├── SkyDome.tsx             # Polar moon path projection
│   ├── PressureChart.tsx       # 24h + 12h pressure sparkline
│   ├── Compass.tsx             # SVG wind/moon direction compass
│   ├── BottomNav.tsx           # 5-tab fixed navigation
│   ├── LocationBar.tsx         # Location display + change
│   ├── FMZBanner.tsx           # FMZ zone display (always visible on Regs)
│   ├── FMZMapPicker.tsx        # Interactive zone picker overlay
│   ├── SeasonBadge.tsx         # IN SEASON / CATCH & RELEASE / CLOSED badge
│   └── SpecialWaterWarning.tsx # Nearby restricted water alert
├── context/
│   └── AppContext.tsx          # Global state — location, FMZ, weather, preferences
├── lib/
│   ├── score.ts                # Fishing score algorithm
│   ├── scoreReason.ts          # Reason string generation
│   ├── outlook.ts              # 7-day daily score aggregation
│   ├── solunar.ts              # Solunar window calculation
│   ├── moon.ts                 # SunCalc wrapper
│   ├── weather.ts              # Open-Meteo fetch + cache
│   ├── waterTemp.ts            # ECCC water temp + fallback regression
│   ├── regulations.ts          # Regulations merge + season status
│   ├── fmz.ts                  # FMZ detection (TopoJSON + city lookup)
│   ├── climate.ts              # Seasonal temperature norms
│   ├── offline.ts              # IndexedDB cache helpers
│   ├── supabase.ts             # Supabase client singleton
│   └── utils.ts                # Formatting — time, cardinal direction
└── types/

public/
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker
├── icons/                      # PWA icons (192, 512)
└── data/
    ├── regulations-2025.json   # Ontario fishing regulations (50+ species × 20 FMZs)
    ├── species.json            # Species habitat, feeding, techniques
    ├── eccc-stations.json      # Water temperature station index
    ├── fmz-cities.json         # City → FMZ lookup (~200 Ontario locations)
    └── fmz-lowres.topojson     # Simplified FMZ boundaries for GPS detection

supabase/
└── schema.sql                  # DB schema (v2 — not used in v1)
```

---

## License

MIT
