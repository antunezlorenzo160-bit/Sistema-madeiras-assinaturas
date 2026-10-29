// Start preparing cold offline launches before Firebase/login finishes loading.
(() => {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return;
  async function registerOffline() {
    const registration = await navigator.serviceWorker.register('/sw.js?revisao=5', {updateViaCache:'none'});
    const worker = registration.installing || registration.waiting;
    if (worker && worker.state !== 'activated') await new Promise((resolve,reject) => {
      const changed = () => {
        if (worker.state === 'activated') { worker.removeEventListener('statechange',changed); resolve(); }
        if (worker.state === 'redundant') { worker.removeEventListener('statechange',changed); reject(Error('offline-install')); }
      };
      worker.addEventListener('statechange',changed); changed();
    });
    return registration;
  }
  window.__smOfflineRegistration = registerOffline().catch(() => null);
  window.__smPrepararArquivosOffline = async force => {
    let registration = await window.__smOfflineRegistration;
    if (!registration || force) {
      window.__smOfflineRegistration = registerOffline();
      registration = await window.__smOfflineRegistration;
    }
    const worker = registration.active;
    if (!worker) throw Error('offline-worker-not-active');
    await new Promise((resolve,reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(Error('offline-prepare-timeout')); },15000);
      channel.port1.onmessage = event => {
        clearTimeout(timer); channel.port1.close();
        if (event.data?.ok === true && event.data.revision === 5) resolve(); else reject(Error('offline-assets'));
      };
      worker.postMessage({type:'SM_PREPARE_OFFLINE',force:Boolean(force)},[channel.port2]);
    });
  };
})();
