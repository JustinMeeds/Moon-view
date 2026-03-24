// CastON Service Worker
const CACHE_NAME = "caston-v1";
const OPEN_METEO_HOST = "api.open-meteo.com";
const ECCC_HOST = "wateroffice.ec.gc.ca";
const OPEN_METEO_TTL_MS = 30 * 60 * 1000;   // 30 min
const ECCC_TTL_MS       = 2 * 60 * 60 * 1000; // 2 h

// App shell + data files to precache on install
const PRECACHE_URLS = [
  "/",
  "/moon",
  "/conditions",
  "/regulations",
  "/species",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/data/regulations-2025.json",
  "/data/fmz-cities.json",
  "/data/eccc-stations.json",
  "/data/species.json",
];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
  );
});

// ── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip webpack HMR
  if (url.pathname.includes("_next/webpack-hmr")) return;

  // Open-Meteo: NetworkFirst with 30-min TTL cache
  if (url.hostname === OPEN_METEO_HOST) {
    event.respondWith(networkFirstWithTTL(request, OPEN_METEO_TTL_MS));
    return;
  }

  // ECCC water temp: NetworkFirst with 2h TTL cache
  if (url.hostname === ECCC_HOST) {
    event.respondWith(networkFirstWithTTL(request, ECCC_TTL_MS));
    return;
  }

  // Public data files: CacheFirst (long-lived bundled data)
  if (url.pathname.startsWith("/data/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML navigation: NetworkFirst → ensures fresh pages, falls back to cache
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Next.js static (_next/static): CacheFirst → immutable hashed files
  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else: StaleWhileRevalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Strategies ─────────────────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response("Offline", { status: 503 });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached ?? (await fetchPromise) ?? new Response("Offline", { status: 503 });
}

async function networkFirstWithTTL(request, ttlMs) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    const dateHeader = cached.headers.get("date");
    if (dateHeader) {
      const cachedAge = Date.now() - new Date(dateHeader).getTime();
      if (cachedAge < ttlMs) return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return cached ?? new Response("Offline", { status: 503 });
  }
}
