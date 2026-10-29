// Cache only the public application shell and its modules, never company/API data.
const CACHE = 'sm-offline-20261029-5';
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
  const allowedQuery = [...url.searchParams.keys()].every(key => key === 'atualizacao');
  const navigation = local && request.mode === 'navigate' && ['/', '/index.html'].includes(url.pathname) && allowedQuery;
  const module = local && url.pathname === '/toras.mjs' && !url.search;
  const sdk = url.href.startsWith(SDK) && url.pathname.endsWith('.js') && !url.search;
  if (!navigation && !module && !sdk) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE), key = navigation ? '/' : request;
    if (sdk) { const saved = await cache.match(key); if (saved) return saved; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(request, {signal:controller.signal});
      if (response.ok && response.type !== 'opaque') {
        await cache.put(key, response.clone()); return response;
      }
      return await cache.match(key) || response;
    } catch (error) {
      const saved = await cache.match(key); if (saved) return saved;
      throw error;
    } finally { clearTimeout(timeout); }
  })());
});
