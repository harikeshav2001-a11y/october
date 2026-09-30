// Offline shell: app files cache-first (refreshed in the background), fonts and the Firebase SDK cached on first use.
const V = 'october-v7'; // bump on every release so phones pick up the new files
const SHELL = ['./', 'index.html', 'app.css', 'app.js', 'store.js', 'config.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const sameOrigin = u.origin === location.origin;
  const cacheable = sameOrigin || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com' ||
    (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'));
  if (!cacheable) return; // Firestore / auth traffic goes straight to the network
  const key = sameOrigin ? u.origin + u.pathname : req; // one copy per file, whatever the query string
  e.respondWith(caches.open(V).then(async (cache) => {
    const hit = await cache.match(key);
    const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(key, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
