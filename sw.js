// sw.js — プログラム一式を端末内に保存し、ネット接続なしで起動できるようにする。
// プログラムを更新したときは CACHE_NAME の番号を必ず上げること（rft-core.js の APP_VERSION と揃える）。
const CACHE_NAME = 'rft-app-1.1.0';
const ASSETS = [
  './',
  './index.html',
  './rft-core.js',
  './rft-store.js',
  './three.module.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('rft-app-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 新しい版の適用は、画面の「更新を適用」ボタンからのみ行う（実験の途中で版が変わらないようにするため）
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// 端末内の保存を優先して使う（ネットに接続していても、保存済みの版で動く）
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const shell = await cache.match('./index.html');
        if (shell) return shell;
      }
      return fetch(req);
    })
  );
});
