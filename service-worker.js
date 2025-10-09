const CACHE_NAME = 'mech-images-v1';

self.addEventListener('install', (event) => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // 只缓存同源图片
  if (req.destination === 'image' && new URL(req.url).origin === self.origin) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(req)
          .then((networkResponse) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse.clone()));
            return networkResponse;
          })
          .catch(() => {
            // 返回透明 1x1 PNG 占位图
            return new Response(
              Uint8Array.from([
                137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,
                0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,
                0,0,0,12,73,68,65,84,8,153,99,0,1,0,0,5,0,1,
                13,10,26,10,0,0,0,0,73,69,78,68,174,66,96,130
              ]),
              { headers: { 'Content-Type': 'image/png' } }
            );
          })
      })
    );
  }
});
