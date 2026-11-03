// Service worker: app utilizzabile offline. La cache cambia a ogni versione.
importScripts("version.js");
const CACHE = `gpverse-notes-${self.GPV_VERSION}`;
const SHELL = [
  "./", "index.html", "styles.css", "version.js", "vendor/supabase.js", "config.js", "i18n.js", "app.js",
  "draw.js", "recorder.js", "idb.js", "translate.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/mark-96.png", "icons/favicon.png",
];
const CDN_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("gpverse-notes-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // librerie e font: prima la cache
  if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
    return;
  }
  // file dell'app: prima la rete (aggiornamenti immediati), poi la cache
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("index.html"))));
  }
  // Supabase e tutto il resto: nessuna cache
});
