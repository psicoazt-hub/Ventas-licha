const CACHE_NAME = 'licha-v2';
const assets = [
  'index.html',
  'manifest.json',
  'https://i.ibb.co/3yk8S6X/136219.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(assets))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
