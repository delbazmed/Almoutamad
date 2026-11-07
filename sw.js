const APP_VERSION = '1.0.1';
const CACHE = 'almoutamad-' + APP_VERSION;
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './libs/html2canvas.min.js',
  './libs/jspdf.umd.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('almoutamad-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  if (isFont) {
    // fonts: cache, refresh in background
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(req).then(hit => {
          const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // app files: cache first, fall back to network, refresh cache
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
        return r;
      }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : undefined);
    })
  );
});
