// service-worker.js

self.addEventListener("install", (event) => self.skipWaiting());

self.addEventListener("activate", (event) => {
  clients.claim();
  // 可选择清理旧缓存，如果需要：
  // event.waitUntil(
  //   caches.keys().then(keys =>
  //     Promise.all(keys.map(key => caches.delete(key)))
  //   )
  // );
});

// 只缓存本地资源，不拦截跨域
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 本地资源缓存
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((resp) => {
          caches.open("local-cache-v1").then((cache) => cache.put(event.request, resp.clone()));
          return resp;
        });
      })
    );
  } else {
    // 其他跨域请求直接走网络，避免 ERR_FAILED
    event.respondWith(fetch(event.request));
  }
});
