// service-worker.js

const CACHE_NAME = 'mech-images-v1';

// 安装：跳过等待，立即激活
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 激活：清理旧缓存
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

// 拦截 fetch 请求
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.destination === 'image' || req.url.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(req)
          .then((networkResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, networkResponse.clone());
              return networkResponse;
            });
          })
          .catch(() => {
            const placeholder = `data:image/svg+xml;base64,${btoa(`<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
              <rect width="150" height="150" fill="#ddd"/>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="12">Image Not Found</text>
            </svg>`)}`;
            return fetch(placeholder);
          });
      })
    );
  }
});

