service-worker.js
const CACHE_NAME = 'my-cache-4';

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

// 所有请求都强制刷新缓存
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request, { cache: "reload" })
      .catch(() => 
        caches.match(event.request)
          .then((cachedResponse) => cachedResponse || new Response("Not found", { status: 404 }))
      )
  );
});


// const CACHE_NAME = 'my-cache';
// const CACHE_MAX_AGE = 1 * 60 * 60 * 1000; // 1小时

// self.addEventListener("install", (event) => {
//   self.skipWaiting();
// });

// self.addEventListener("activate", (event) => {
//   event.waitUntil(
//     caches.keys().then((keys) =>
//       Promise.all(keys.map((key) => caches.delete(key)))
//     )
//   );
//   clients.claim();
// });

// self.addEventListener("fetch", (event) => {
//   event.respondWith(
//     caches.open(CACHE_NAME).then(async (cache) => {
//       const cachedResponse = await cache.match(event.request);
//       if (cachedResponse) {
//         // 检查是否过期
//         const fetchedTime = cachedResponse.headers.get('sw-fetched-time');
//         if (!fetchedTime || (Date.now() - Number(fetchedTime) > CACHE_MAX_AGE)) {
//           fetchAndCache(event.request, cache); // 异步刷新
//         }
//         return cachedResponse;
//       } else {
//         return fetchAndCache(event.request, cache);
//       }
//     })
//   );
// });

// async function fetchAndCache(request, cache) {
//   try {
//     const response = await fetch(request);
//     if (response.ok) {
//       // 克隆并加自定义 header
//       const headers = new Headers(response.headers);
//       headers.set('sw-fetched-time', Date.now());
//       const cloned = new Response(response.body, {
//         status: response.status,
//         statusText: response.statusText,
//         headers
//       });
//       cache.put(request, cloned.clone());
//       return cloned;
//     } else {
//       // 不缓存 404 或错误响应
//       return response;
//     }
//   } catch (err) {
//     // 网络失败 fallback
//     const cached = await cache.match(request);
//     return cached || new Response("Not found", { status: 404 });
//   }
// }




