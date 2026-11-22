// Retirement worker: old installed apps must escape their cached HTML even when
// that HTML never loads the current application's cleanup code.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    await Promise.all(clients.map(async client => {
      const url = new URL(client.url);
      if (!url.href.startsWith(self.registration.scope)) return;
      // One migration navigation; preserve deep links and keep offline pages usable.
      if (url.searchParams.has('_app_refresh')) return;
      url.searchParams.set('_app_refresh', String(Date.now()));
      try {
        const response = await fetch(url.href, { cache: 'no-store' });
        if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
          await client.navigate(url.href);
        }
      } catch {
        // A later online navigation will load the current app without the old worker.
      }
    }));
  })());
});
