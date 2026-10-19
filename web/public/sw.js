/**
 * AfriCab Service Worker — Auto-Update & Cache-Bust Strategy
 *
 * Responsibilities:
 *  1. On every install: skip waiting → activate immediately (no stuck SW).
 *  2. On activate: claim all open clients immediately.
 *  3. On every fetch: pass through to network (no aggressive caching that
 *     would stale the app). This ensures the JS chunks, HTML, and API
 *     responses are always fresh from Vercel's CDN.
 *  4. Listen for a "SKIP_WAITING" postMessage from the page — when the
 *     AppUpdateWatcher detects a new deployment it can also trigger this
 *     path to wake a pending SW and reload clients.
 *  5. Broadcast a "RELOAD" message to all controlled clients when a new
 *     SW activates, so any tab that missed the version-poll reload still
 *     gets refreshed.
 */

const CACHE_NAME = "africab-v1";

/* ── Install: activate without waiting for old tabs to close ────────────── */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

/* ── Activate: claim clients + notify them to reload ────────────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Delete old caches from previous versions
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      // Take control of all open tabs immediately
      await self.clients.claim();

      // Tell every controlled client to reload — a new SW means a new deploy
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      allClients.forEach((client) => {
        client.postMessage({ type: "SW_UPDATED" });
      });
    })()
  );
});

/* ── Fetch: pure network-first — no stale cache ─────────────────────────── */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept same-origin requests
  if (url.origin !== location.origin) return;

  // Always fetch fresh from network — no cache responses for app assets
  // This guarantees users always run the latest deployed code.
  event.respondWith(
    fetch(request).catch(() => {
      // If offline, attempt cache fallback for navigation requests only
      if (request.mode === "navigate") {
        return caches.match("/") || Response.error();
      }
      return Response.error();
    })
  );
});

/* ── Message handler: SKIP_WAITING from page ─────────────────────────────── */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
