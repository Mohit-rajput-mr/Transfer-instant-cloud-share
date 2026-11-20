/* Offline send (src/app/offline/OfflineView.tsx). Registered only by /offline, scoped to /offline, so it never touches
 * the rest of the site. It keeps a copy of the /offline page and the scripts/styles it loaded, so the page opens with no
 * internet (the transfer itself is device to device over the local network and needs no server).
 * Pages: network first (fresh when online), the saved copy when offline. Hashed /_next/static files: cache first. */
const CACHE = "orbi-offline-v1";

self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.add("/offline")).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith("orbi-offline-") && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
// the page sends the list of scripts/styles it loaded (they were fetched before this worker was in control)
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "cache" && Array.isArray(d.urls)) {
    const same = d.urls.filter((u) => { try { return new URL(u, self.location.origin).origin === self.location.origin; } catch { return false; } });
    e.waitUntil(caches.open(CACHE).then((c) => Promise.all(same.map((u) => c.add(u).catch(() => {})))));
  }
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (r.mode === "navigate") {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/offline", copy)); } return res; })
      .catch(() => caches.match("/offline").then((m) => m || Response.error())));
    return;
  }
  if (u.pathname.startsWith("/_next/static/") || u.pathname.startsWith("/brand/") || u.pathname === "/favicon.ico") {
    e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })));
  }
});
