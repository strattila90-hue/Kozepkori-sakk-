/* Szolgáltató-munkás: offline játék + frissítés. A CACHE neve a verzióval együtt változik. */
const VERSION = '1.0.0', CACHE = 'parasztsakk-' + VERSION;
const CORE = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'firebase-config.js', 'js/util.js', 'js/chess.js', 'js/protocol.js', 'js/audio.js', 'js/sprites.js', 'js/figures.js', 'js/world.js', 'js/lines.js', 'js/fx.js', 'js/net.js', 'js/qrcode.js', 'js/scenes.js', 'js/main.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'assets/figs/meta.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('parasztsakk-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin) return;     // Firebase, betűtípusok: hálózat
  if (u.pathname.endsWith('version.json')) { e.respondWith(fetch(r, { cache: 'no-store' }).catch(() => caches.match(r))); return; }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })));
});
