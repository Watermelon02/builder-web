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

  // 只缓存图片请求，可根据需要扩展
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          // 已缓存，直接返回
          return cachedResponse;
        }

        // 未缓存，去网络请求
        return fetch(req)
          .then((networkResponse) => {
            // 网络请求成功则缓存
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, networkResponse.clone());
              return networkResponse;
            });
          })
          .catch(() => {
            // 网络请求失败，返回占位图片
            return new Response(
              `<svg width="150" height="150" xmlns="http://www.w3.org/2000/svg">
                 <rect width="150" height="150" fill="#ddd"/>
                 <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-size="12">Image Not Found</text>
               </svg>`,
              {
                headers: { 'Content-Type': 'image/svg+xml' },
              }
            );
          });
      })
    );
  }
});
