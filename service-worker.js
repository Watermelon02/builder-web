// service-worker.js

// 跳过等待，立即激活
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// 激活时清理所有旧缓存
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  clients.claim(); // 立即控制所有页面
});


