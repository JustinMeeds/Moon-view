# 🌙 Moon Tracker

A mobile-first Moon Tracker PWA. Open it on your phone and instantly see where the Moon is, whether it's visible, and where it'll be tonight — with an interactive altitude graph.

**Installable on iPhone and Android home screens.** All calculations run client-side with no API key required.

---

## Features

| Screen | What it does |
|--------|-------------|
| **Now** | Current moon direction, altitude, phase, visibility, moonrise/set |
| **Tonight** | Altitude-over-time chart for tonight (6 PM–6 AM) with a scrubber |
| **Explore** | Pick any date — graph + summary + best viewing window |
| **Settings** | GPS / manual location, 12/24h toggle, cardinal labels, Supabase auth |

- Mini compass visualization with moon position
- 16-point cardinal direction labels (N, NNE, NE…)
- Moonrise, moonset, peak altitude markers on chart
- Best viewing window calculation
- Illumination percentage + phase emoji
- Graceful geolocation denial → manual city entry (Nominatim geocoding)
- Supabase optional auth + saved locations + preferences sync
- Dark-sky friendly dark theme, large text, one-handed mobile layout
- Installable PWA with offline shell caching

---

## Tech Stack

- **Next.js 16** — App Router, TypeScript
- **Tailwind CSS v4** — styling
- **shadcn/ui primitives** — custom dark-themed components
- **astronomy-engine** — moon/sun/planet positions, phase, rise/set calculations (arcminute accuracy)
- **Recharts** — altitude-over-time area chart
- **Supabase** — optional auth, saved locations, preferences
- **OpenStreetMap Nominatim** — free geocoding (no API key)
- **Service Worker** — offline shell + static asset caching

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/justinmeeds/moon-view.git
cd moon-view
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`. Supabase is **optional** — the app works fully without it:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Generate PWA icons (optional — already included)

```bash
npm run generate-icons
```

---

## Supabase Setup (optional)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon key** from Project Settings → API
4. Paste them into `.env.local`

This enables:
- User accounts (email/password)
- Saved locations synced across devices
- Preferences (time format, cardinal labels) persisted server-side

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

# Set env vars in Vercel dashboard or via CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

The `vercel.json` in this repo ensures the service worker and manifest are served with correct headers.

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

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout — AppProvider, BottomNav, SW registrar
│   ├── page.tsx            # Home / Now screen
│   ├── tonight/page.tsx    # Tonight screen
│   ├── explore/page.tsx    # Date Explorer screen
│   └── settings/page.tsx   # Settings screen
├── components/
│   ├── ui/                 # Button, Card, Input, Badge primitives
│   ├── Compass.tsx         # SVG compass with moon position
│   ├── MoonChart.tsx       # Recharts altitude chart + scrubber
│   ├── LocationBar.tsx     # Location display + change controls
│   ├── NoLocation.tsx      # GPS prompt / manual entry gate
│   ├── BottomNav.tsx       # Fixed bottom tab navigation
│   └── ServiceWorkerRegistrar.tsx
├── context/
│   └── AppContext.tsx      # Global state — location, preferences, auth
├── lib/
│   ├── moon.ts             # astronomy-engine wrapper — position, phase, rise/set, charts
│   ├── supabase.ts         # Supabase client singleton + types
│   └── utils.ts            # Formatting helpers, azimuth→cardinal
└── types/
    └── supabase.ts         # Generated database type definitions

public/
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (network-first HTML, cache-first assets)
└── icons/
    ├── icon-192.png
    └── icon-512.png

supabase/
└── schema.sql              # Full DB schema with RLS policies
```

---

## Moon Calculations

All calculations use [astronomy-engine](https://github.com/cosinekitty/astronomy) (VSOP87/ELP-based, verified upstream against JPL Horizons):

| Value | Source | Notes |
|-------|--------|-------|
| Altitude / Azimuth | `Equator` + `Horizon` | Topocentric, airless (USNO convention); 0° az = North, clockwise |
| Cardinal | azimuth degrees | `round(az / 22.5) % 16` → 16-point label |
| Phase / Illumination | `MoonPhase`, `Illumination` | 0 = new, 0.5 = full |
| Rise / Set | `SearchRiseSet` | Refraction-corrected, per local calendar day |
| Distance | `GeoVector` | Geocentric, km |
| Perigee | `SearchLunarApsis` | Next perigee date + distance |

Values are regression-tested against USNO reference data (`npm test`) — rise/set within ±2 min, positions within ±0.05°.

Chart data is computed at 15-minute intervals across the full 24-hour day.

---

## License

MIT
