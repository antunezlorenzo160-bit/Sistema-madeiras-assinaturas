// Bound only the initial saved-session network check. Firebase still restores
// and validates its own user; no tokens, passwords or user records are rewritten.
(() => {
  if (window.__smConcluirRestauracaoAuth || typeof window.fetch !== 'function') return;
  const originalFetch = window.fetch.bind(window);
  let restoring = true;
  window.__smAuthNetworkUnavailable = false;
  window.__smConcluirRestauracaoAuth = () => { restoring = false; };
  window.fetch = function(input, init) {
    let url;
    try { url = new URL(typeof input === 'string' ? input : input.url, window.location.href); }
    catch { return originalFetch(input, init); }
    const sessionCheck =
      (url.hostname === 'identitytoolkit.googleapis.com' && url.pathname === '/v1/accounts:lookup') ||
      (url.hostname === 'securetoken.googleapis.com' && url.pathname === '/v1/token');
    if (!restoring || !sessionCheck) return originalFetch(input, init);
    if (navigator.onLine === false) {
      window.__smAuthNetworkUnavailable = true;
      return Promise.reject(new TypeError('Saved-session network unavailable'));
    }
    const controller = new AbortController();
    const signal = init?.signal || (typeof input === 'object' ? input.signal : null);
    const cancel = () => controller.abort(signal?.reason);
    if (signal?.aborted) cancel(); else signal?.addEventListener('abort',cancel,{once:true});
    let timer;
    const timeout = new Promise((_,reject) => {
      timer = setTimeout(() => {
        window.__smAuthNetworkUnavailable = true;
        controller.abort();
        reject(new TypeError('Saved-session network timeout'));
      },1500);
    });
    return Promise.race([originalFetch(input,{...init,signal:controller.signal}),timeout])
      .catch(error => { if (!signal?.aborted) window.__smAuthNetworkUnavailable = true; throw error; })
      .finally(() => { clearTimeout(timer); signal?.removeEventListener('abort',cancel); });
  };
})();
