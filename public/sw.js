// Service worker for Meme Machine. Ported from the Meme Streeps repo, whose SW
// was fixed for GitHub Pages subpath deploys (base-path aware, no stale 404s).
//
// Bump CACHE_VERSION to force all clients to drop the old cache and refetch.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `meme-machine-${CACHE_VERSION}`;

// Base path is inferred from the SW's own URL, so this works both on a root
// deploy (/) and on GitHub Pages (/meme-machine/). The SW script lives alongside
// index.html, so stripping `sw.js` off the path gives the base.
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const APP_SHELL = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icon.svg',
];

// ─── Install ─────────────────────────────────────────────────────────────────
// Precache the app shell, tolerating individual 404s so install completes even
// if one file is momentarily missing. If install rejected, the new SW would
// never activate and clients would stay stuck on the old SW.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        APP_SHELL.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {
              /* swallow per-file failures */
            })
        )
      );
    })()
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
// Delete every cache that isn't the current one, so stale assets are evicted as
// soon as the new SW takes over.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
// Strategy:
//   - HTML / JS / CSS  → network-first (fall back to cache when offline), so new
//     app code rolls out immediately on next online visit.
//   - Images & fonts   → stale-while-revalidate: serve cached for speed, refresh
//     in the background.
//   - Anything else    → network-first.
//
// We never serve a cached response for a URL that 404s right now — a non-OK
// network response is NOT replaced with a stale cached version.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests entirely (Google Fonts, Supabase, etc.).
  if (url.origin !== self.location.origin) return;

  const dest = req.destination;
  const isImage = dest === 'image' || /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(url.pathname);
  const isFont = dest === 'font' || /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);
  const isAppShell =
    dest === 'document' ||
    dest === 'script' ||
    dest === 'style' ||
    /\.(html|js|mjs|css)$/i.test(url.pathname);

  if (isAppShell) {
    event.respondWith(networkFirst(req));
  } else if (isImage || isFont) {
    event.respondWith(staleWhileRevalidate(req));
  } else {
    event.respondWith(networkFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (req.destination === 'document') {
      const fallback = await cache.match(BASE + 'index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const networkPromise = fetch(req)
    .then((res) => {
      // Only update cache for OK responses — 404s must not replace good entries.
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || (await networkPromise) || new Response('Offline', { status: 503 });
}
