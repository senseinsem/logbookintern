const CACHE_NAME = "bernama-logbook-v1";
const SHELL = ["./","./index.html","./style.css","./script.js","./manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => { if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE_NAME).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request))); });
// Only caches the app shell. Never touches LocalStorage or IndexedDB.
