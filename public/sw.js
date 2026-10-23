// Only cache application assets. Never cache APIs, signatures, tokens or company data here.
const CACHE = 'sm-offline-20261023-2';
const SDK = 'https://www.gstatic.com/firebasejs/12.2.1/';
const CORE = ['/', '/toras.mjs', ...['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(file => SDK + file)];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('sm-offline-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET') return;
  const local = url.origin === self.location.origin;
  const navigation = local && request.mode === 'navigate' && ['/', '/index.html'].includes(url.pathname) && !url.search;
  const module = local && url.pathname === '/toras.mjs' && !url.search;
  const sdk = url.href.startsWith(SDK) && url.pathname.endsWith('.js') && !url.search;
  if (!navigation && !module && !sdk) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = navigation ? '/' : request;
    if (sdk) { const found = await cache.match(key); if (found) return found; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(request, {signal:controller.signal});
      if (response.ok && response.type !== 'opaque') await cache.put(key, response.clone());
      return response;
    } catch (error) {
      const found = await cache.match(key);
      if (found) return found;
      throw error;
    } finally { clearTimeout(timeout); }
  })());
});
