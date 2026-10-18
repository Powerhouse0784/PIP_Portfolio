/* Pip's Dream Workshop service worker.
 * Pages: network first (always fresh when online), cached copy when offline.
 * Build files, images and icons: cache first (they never change under the same URL).
 * API calls, the admin page, audio and cross-origin requests are never touched. */
const VERSION = "pip-v20";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PRECACHE = ["/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/images/hero.webp", "/images/wave.webp", "/images/box.webp", "/images/lamp.webp", "/images/og.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const OFFLINE = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pip is offline</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fff8f1;color:#5c4033;font-family:system-ui,sans-serif;text-align:center;padding:24px"><main><h1 style="font-size:2rem">Pip is napping offline</h1><p>The nursery is out of signal. Open it once while online and Pip will keep it for you.</p><p><a href="/" style="color:#a34063">Try again</a></p></main></body></html>`;

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res && res.ok && res.type === "basic" && !res.redirected) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(request)) || (await cache.match("/"));
    return hit || new Response(OFFLINE, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok && res.type === "basic") cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.startsWith("/api/") || path.startsWith("/admin") || path === "/sw.js") return;
  if (req.mode === "navigate") { event.respondWith(networkFirst(req)); return; }
  if (path.startsWith("/_next/static/") || path.startsWith("/images/") || path.startsWith("/icons/") || path === "/icon.svg") {
    event.respondWith(cacheFirst(req));
  }
});
