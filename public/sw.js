// Cache only the public application shell and its modules, never company/API data.
const CACHE = 'sm-offline-billing-access-1';
const SDK = 'https://www.gstatic.com/firebasejs/12.2.1/';
const CORE = ['/', '/toras.mjs', ...['firebase-app.js','firebase-auth.js','firebase-firestore.js'].map(file => SDK + file)];
async function prepareCore(force = false) {
  const cache = await caches.open(CACHE);
  await Promise.all(CORE.map(async url => {
    if (!force && await cache.match(url)) return;
    const response = await fetch(new Request(new URL(url, self.location.origin).href, {cache:'reload'}));
    if (!response.ok || response.type === 'opaque') throw Error('offline-asset-unavailable');
    await cache.put(url, response.clone());
  }));
  return true;
}
self.addEventListener('install', event => {
  event.waitUntil(prepareCore().then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await prepareCore();
    for (const key of await caches.keys()) if (key.startsWith('sm-offline-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'SM_PREPARE_OFFLINE') return;
  event.waitUntil(prepareCore(event.data.force === true).then(
    () => event.ports[0]?.postMessage({ok:true,revision:5}),
    () => event.ports[0]?.postMessage({ok:false,revision:5})
  ));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET') return;
  const local = url.origin === self.location.origin;
  const allowedQuery = [...url.searchParams.keys()].every(key => key === 'atualizacao' || key === 'revisao');
  const navigation = local && request.mode === 'navigate' && ['/', '/index.html'].includes(url.pathname) && allowedQuery;
  const module = local && url.pathname === '/toras.mjs' && !url.search;
  const sdk = url.href.startsWith(SDK) && url.pathname.endsWith('.js') && !url.search;
  if (!navigation && !module && !sdk) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), key = navigation ? '/' : request;
    const saved = await cache.match(key);
    // No network probe is needed to return a known public file while offline.
    if (saved && (self.navigator?.onLine === false || sdk)) return saved;
    const refresh = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(request, {signal:controller.signal});
        if (response.ok && response.type !== 'opaque') {
          await cache.put(key, response.clone()); return response;
        }
        return saved || response;
      } catch (error) {
        if (saved) return saved;
        throw error;
      } finally { clearTimeout(timeout); }
    })();
    // Keep modules immediate, and let a cached page wait at most one second
    // for a newer online copy. Updating these public files does not read Firestore.
    if (saved) {
      event.waitUntil(refresh.catch(() => {}));
      if (module) return saved;
      let fallbackTimer;
      try {
        return await Promise.race([refresh,new Promise(resolve => {
          fallbackTimer = setTimeout(() => resolve(saved),1000);
        })]);
      } finally { clearTimeout(fallbackTimer); }
    }
    return refresh;
  })());
});
