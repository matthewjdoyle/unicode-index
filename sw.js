/* ═══════════════════════════════════════════════════════
   Unicode Index — sw.js
   Service Worker: versioned cache, three caching strategies
   ═══════════════════════════════════════════════════════ */

const CACHE_NAME = "unicode-index-v1";

// Pre-cached on SW install. All must succeed or install fails.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/unicode-data.js",
  "/confusables-data.js",
  "/site.webmanifest",
  "/favicon.svg",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

// ── Install: pre-cache all critical assets ────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: evict all old-version caches ────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: route to the right strategy ───────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  const path = url.pathname;

  // Stale-while-revalidate: app shell (serve cache, refresh in background)
  if (
    path === "/" ||
    path === "/index.html" ||
    path === "/app.js" ||
    path === "/styles.css" ||
    path === "/site.webmanifest"
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Cache-first: large stable data files (pre-cached on install)
  if (path === "/unicode-data.js" || path === "/confusables-data.js") {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Cache-on-first-use: 3.7 MB extended data (not pre-cached; stored after lazy-load)
  if (path === "/unicode-data-ext.js") {
    event.respondWith(cacheOnFirstUse(event.request));
    return;
  }

  // All other same-origin requests (icons, etc.): cache-first
  event.respondWith(cacheFirst(event.request));
});

// ── Strategy implementations ──────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || networkFetch;
}

async function cacheOnFirstUse(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}
