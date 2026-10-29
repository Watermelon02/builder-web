/* Resource bytes and allowlisted font styles only. Never cache app code or APIs. */
(() => {
  'use strict';
  const CACHE = 'ember-resources-v1';
  const META = 'ember-resource-metadata-v1';
  const PROTOCOL = 'ember-resource-cache-v1';
  const scope = new URL(self.registration.scope);
  const pending = new Map();
  const clientsConfig = new Map();
  const configuring = new Map();
  const queue = [];
  let active = 0;
  let activeModels = 0;
  const legacyNames = () => caches.keys().then(names => names.filter(name => name.startsWith('ember-img-') || name.startsWith('ember-game-scene-v')));
  const metaUrl = key => new URL(`__resource_cache_metadata__/${key}`, scope).href;
  const absolute = value => new URL(value, scope).href;
  const isModel = value => /\.glb(?:\?|$)/i.test(value);
  const isFont = value => /\.(?:woff2?|ttf|otf)(?:\?|$)/i.test(value);
  function fontStyle(value) {
    const url = new URL(value, scope);
    return ['https://fonts.googleapis.com', 'https://fonts.geekzu.org'].includes(url.origin) && url.pathname === '/css2';
  }
  function managed(value) {
    try {
      const url = new URL(value, scope);
      if (url.username || url.password || url.hash) return false;
      if (fontStyle(url)) {
        return url.searchParams.getAll('family').length === 1
          && ['Orbitron:wght@400;500;700', 'Noto+Sans+SC:wght@400;500;700', 'Kosugi+Maru'].includes(url.searchParams.get('family').replaceAll(' ', '+'))
          && url.searchParams.get('display') === 'swap'
          && [...url.searchParams.keys()].every(key => ['family', 'display', 'v'].includes(key));
      }
      if (!/\.(?:webp|png|jpe?g|gif|svg|avif|glb|woff2?|ttf|otf)$/i.test(url.pathname)) return false;
      if ([...url.searchParams.keys()].some(key => key !== 'v')) return false;
      if (url.origin === 'https://fonts.gstatic.com') return /^\/s\/(?:orbitron|notosanssc|kosugimaru)\/v\d+\/[^/]+\.(?:woff2?|ttf|otf)$/i.test(url.pathname);
      if (url.origin === scope.origin) {
        const path = url.pathname.slice(scope.pathname.length);
        return url.pathname.startsWith(scope.pathname) && /^(?:(?:res|models|textures)\/|replay-assets\/[a-f0-9]+\/(?:res|models|textures)\/)/.test(path);
      }
      return (url.origin === 'https://op-1307392056.cos.ap-guangzhou.myqcloud.com' && /^\/(?:res|models|textures)\//.test(url.pathname))
        || (url.origin === 'https://raw.githubusercontent.com' && /^\/Watermelon02\/builder-web\/main\/(?:res|models|textures)\//.test(url.pathname));
    } catch { return false; }
  }
  async function readMeta(key) {
    try { return await (await (await caches.open(META)).match(metaUrl(key)))?.json(); } catch { return undefined; }
  }
  async function writeMeta(key, value) {
    await (await caches.open(META)).put(metaUrl(key), new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }));
  }
  async function configFor(clientId) {
    if (clientsConfig.has(clientId)) return clientsConfig.get(clientId);
    const ref = await readMeta(`clients/${clientId}`);
    const stored = ref && await readMeta(`config/${ref.id}`);
    const config = { version: '1', sceneVersion: '1', fontVersion: '1', ...stored, aliases: new Map(stored?.aliases || []) };
    clientsConfig.set(clientId, config);
    return config;
  }
  function canonical(value, config) {
    const url = new URL(value, scope);
    if (/\/replay-assets\/[a-f0-9]+\//.test(url.pathname)) return url.href;
    if (!url.searchParams.has('v')) {
      const alias = config.aliases.get(url.href);
      if (alias) return canonical(alias, config);
      url.searchParams.set('v', fontStyle(url) || isFont(url.href) ? config.fontVersion : /\/(?:models|textures)\//.test(url.pathname) ? config.sceneVersion : config.version);
    }
    // Providers tailor CSS to the user agent. Keep these variants apart while
    // sharing immutable font bytes across CSS, FontFace and export consumers.
    if (fontStyle(url)) url.searchParams.set('__font_ua', self.navigator?.userAgent || '');
    return url.href;
  }
  function schedule(url, task) {
    return new Promise((resolve, reject) => {
      queue.push({ model: isModel(url), task, resolve, reject });
      drain();
    });
  }
  function drain() {
    while (active < 6) {
      const index = queue.findIndex(item => !item.model || activeModels < 3);
      if (index < 0) break;
      const item = queue.splice(index, 1)[0];
      active++;
      if (item.model) activeModels++;
      Promise.resolve().then(item.task).then(item.resolve, item.reject).finally(() => {
        active--;
        if (item.model) activeModels--;
        drain();
      });
    }
  }
  async function valid(response, url, body) {
    if (!response || !response.ok || response.type === 'opaque' || response.status !== 200) return false;
    const type = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() || '';
    if (fontStyle(url)) {
      if (type !== 'text/css') return false;
      const css = body ? new TextDecoder().decode(body) : await response.clone().text();
      return /@font-face\s*\{/i.test(css) && /\bsrc\s*:\s*[^;]*url\(/i.test(css) && !/<\/?(?:html|script|!doctype)\b/i.test(css);
    }
    if (isFont(url)) {
      if (!/^(?:font\/|application\/(?:font-|x-font-|octet-stream))/.test(type)) return false;
      const bytes = body || await response.clone().arrayBuffer();
      if (bytes.byteLength < 12) return false;
      const header = new DataView(bytes);
      const magic = header.getUint32(0);
      if (magic === 0x774f4632 || magic === 0x774f4646) {
        return bytes.byteLength >= (magic === 0x774f4632 ? 48 : 44) && header.getUint32(8) === bytes.byteLength;
      }
      return magic === 0x00010000 || magic === 0x4f54544f;
    }
    if (isModel(url)) {
      const bytes = body || await response.clone().arrayBuffer();
      if (bytes.byteLength < 20) return false;
      const header = new DataView(bytes);
      return header.getUint32(0, true) === 0x46546c67 && header.getUint32(4, true) === 2 && header.getUint32(8, true) === bytes.byteLength;
    }
    return type.startsWith('image/') && Number(response.headers.get('Content-Length') || 1) !== 0;
  }
  async function findCached(url) {
    let cache;
    try {
      cache = await caches.open(CACHE);
      const hit = await cache.match(url, { ignoreVary: true });
      if (hit && await valid(hit, url)) return { response: hit, saved: true };
      if (hit) await cache.delete(url);
      // Only migrate readable public responses. Opaque entries cannot serve CORS consumers.
      for (const name of await legacyNames()) {
        const legacy = await caches.open(name);
        const old = await legacy.match(url, { ignoreVary: true });
        if (!old || !await valid(old, url)) continue;
        try {
          await cache.put(url, old.clone());
          if (!/\/replay-assets\//.test(url)) {
            await legacy.delete(url, { ignoreVary: true });
            if (!(await legacy.keys()).length) await caches.delete(name);
          }
          return { response: old, saved: true };
        }
        catch (error) { return { response: old, saved: false, quota: error?.name === 'QuotaExceededError' }; }
      }
    } catch { /* Cache Storage is optional. */ }
    return null;
  }
  async function download(url, batch) {
    if (batch?.stopped || (batch?.failures.get(new URL(url).origin) || 0) >= 5) return { skipped: true };
    const networkUrl = new URL(url);
    if (fontStyle(url) || networkUrl.origin === 'https://fonts.gstatic.com') {
      // Cache version and browser variant are local keys, not provider API parameters.
      networkUrl.searchParams.delete('v');
      networkUrl.searchParams.delete('__font_ua');
    }
    const candidates = [networkUrl.href];
    if (fontStyle(url) && networkUrl.origin === 'https://fonts.geekzu.org') {
      candidates.push(networkUrl.href.replace('https://fonts.geekzu.org/', 'https://fonts.googleapis.com/'));
    }
    for (const [index, candidate] of candidates.entries()) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(candidate, {
          mode: 'cors', credentials: 'omit', signal: controller.signal,
          // A manual font version/browser change needs fresh declarations; a
          // persistent hit never reaches this branch or the provider at all.
          cache: fontStyle(url) ? 'reload' : 'default',
        });
        // Consume the body under the same deadline; receiving headers isn't completion.
        const bytes = await response.clone().arrayBuffer();
        const stored = response;
        if (response.type === 'opaque' || !await valid(stored, url, bytes)) {
          if (index + 1 < candidates.length) continue;
          return { response: stored, saved: false, failed: true, originFailure: response.status >= 500 };
        }
        let saved = false;
        let quota = false;
        try { await (await caches.open(CACHE)).put(url, stored.clone()); saved = true; }
        catch (error) { quota = error?.name === 'QuotaExceededError'; }
        return { response: stored, saved, quota };
      } catch (error) {
        if (index + 1 < candidates.length) continue;
        return { failed: true, saved: false, originFailure: true, error };
      } finally { clearTimeout(timer); }
    }
  }
  async function getResource(url, batch) {
    const cached = await findCached(url);
    if (cached) return cached;
    let request = pending.get(url);
    if (!request) {
      request = schedule(url, () => download(url, batch)).finally(() => pending.delete(url));
      pending.set(url, request);
    }
    const result = await request;
    if (batch) {
      const origin = new URL(url).origin;
      if (result.quota) batch.stopped = true;
      if (result.originFailure) batch.failures.set(origin, (batch.failures.get(origin) || 0) + 1);
      else if (!result.skipped) batch.failures.set(origin, 0);
    }
    return { ...result, response: result.response?.clone() };
  }
  async function digest(urls) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(urls)));
    return [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('');
  }
  function configure(clientId, data) {
    // Font startup and the builder manifest may register at the same time.
    // Serialize each client's merges so neither can replace the other's aliases.
    const previous = configuring.get(clientId) || Promise.resolve();
    const next = previous.catch(() => undefined).then(() => configureClient(clientId, data));
    configuring.set(clientId, next);
    return next.finally(() => { if (configuring.get(clientId) === next) configuring.delete(clientId); });
  }
  async function configureClient(clientId, data) {
    const previous = await configFor(clientId);
    const aliases = new Map(previous.aliases);
    for (const value of data.urls || []) {
      if (!managed(value)) continue;
      const url = new URL(value, scope);
      if (!url.searchParams.has('v')) continue;
      const alias = new URL(url);
      alias.searchParams.delete('v');
      aliases.set(alias.href, url.href);
    }
    const version = typeof data.version === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(data.version) ? data.version : previous.version;
    const sceneVersion = typeof data.sceneVersion === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(data.sceneVersion) ? data.sceneVersion : previous.sceneVersion;
    const fontVersion = typeof data.fontVersion === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(data.fontVersion) ? data.fontVersion : previous.fontVersion;
    const stored = { version, sceneVersion, fontVersion, aliases: [...aliases.entries()].sort((a, b) => a[0].localeCompare(b[0])) };
    const id = await digest([JSON.stringify(stored)]);
    clientsConfig.set(clientId, { version, sceneVersion, fontVersion, aliases });
    try {
      if (!await readMeta(`config/${id}`)) await writeMeta(`config/${id}`, stored);
      await writeMeta(`clients/${clientId}`, { id });
      // Metadata references can expire with tabs; resource bytes are never evicted here.
      const live = new Set((await self.clients.matchAll({ includeUncontrolled: true })).map(client => client.id));
      const meta = await caches.open(META);
      for (const request of await meta.keys()) {
        const prefix = metaUrl('clients/');
        if (request.url.startsWith(prefix) && !live.has(request.url.slice(prefix.length))) {
          await meta.delete(request);
          clientsConfig.delete(request.url.slice(prefix.length));
        }
      }
    } catch { /* Persisting configuration must not block rendering. */ }
    return { configured: true };
  }
  async function pack(clientId, data, send) {
    const config = await configFor(clientId);
    const urls = [...new Set((data.urls || []).filter(managed).map(value => canonical(value, config)))].sort();
    const id = await digest(urls);
    const key = `packs/${id}`;
    const complete = (await readMeta(key))?.complete === true;
    if (data.action === 'status') return { id, total: urls.length, complete };
    const result = { id, total: urls.length, processed: 0, cached: 0, failed: 0, saveFailed: 0, complete: false };
    if (complete) return { ...result, processed: urls.length, cached: urls.length, complete: true };
    const batch = { failures: new Map(), stopped: false };
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(6, urls.length) }, async () => {
      while (next < urls.length) {
        const url = urls[next++];
        const loaded = await getResource(url, batch);
        result.processed++;
        if (loaded.saved) result.cached++;
        else if (loaded.response && !loaded.failed) result.saveFailed++;
        else result.failed++;
        send({ progress: { ...result } });
      }
    }));
    result.complete = result.cached === result.total;
    if (result.complete) {
      try { await writeMeta(key, { complete: true, total: urls.length }); }
      catch { result.complete = false; }
    }
    return result;
  }
  self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET' || request.headers.has('Authorization') || !managed(request.url)) return;
    event.respondWith((async () => {
      const config = await configFor(event.clientId);
      const url = canonical(request.url, config);
      const result = await getResource(url);
      if (!result.response) {
        // Public images may remain displayable even when a host's CORS setup is
        // incomplete. Never persist opaque fallback bytes or use them for Canvas.
        if (request.mode === 'no-cors') return fetch(url, { mode: 'no-cors', credentials: 'omit' });
        throw result.error || new Error('Resource unavailable');
      }
      if (result.failed) return result.response;
      // Preserve the CORS response type from the canonical fetch for origin-clean canvases.
      return result.response;
    })());
  });
  self.addEventListener('message', event => {
    if (event.data?.protocol !== PROTOCOL || !event.ports[0] || !event.source?.id) return;
    const port = event.ports[0];
    const send = value => port.postMessage(value);
    event.waitUntil((async () => {
      try {
        const data = event.data;
        if (!['configure', 'status', 'ensure'].includes(data.action) || !Array.isArray(data.urls) || data.urls.length > 20000) throw new Error('Invalid cache request');
        const client = await self.clients.get(event.source.id);
        if (!client || new URL(client.url).origin !== scope.origin || !new URL(client.url).pathname.startsWith(scope.pathname)) throw new Error('Invalid cache client');
        const result = data.action === 'configure' ? await configure(client.id, data) : await pack(client.id, data, send);
        send({ result });
      } catch (error) { send({ error: String(error?.message || error) }); }
    })());
  });
})();
