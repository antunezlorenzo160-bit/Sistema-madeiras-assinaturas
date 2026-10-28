(() => {
  function initialize() {
    const counter = document.getElementById('miniContadorPacotes');
    const number = document.getElementById('miniNumeroPacotesM2');
    if (!counter || !number) return false;
    const originalToggle = document.getElementById('btnLigaPacotes');
    const status = document.getElementById('statusPacotesM2');
    const launch = document.getElementById('btnLancar');
    if (originalToggle && status && launch && !document.getElementById('btnContadorCompacto')) {
      const toggle = document.createElement('button');
      toggle.id = 'btnContadorCompacto';
      toggle.type = 'button';
      toggle.className = 'btn btn-secondary no-print';
      launch.parentElement.appendChild(toggle);
      function syncToggle() {
        const enabled = status.classList.contains('ligado');
        toggle.textContent = enabled ? 'Desligar contador' : 'Ligar contador';
        toggle.setAttribute('aria-pressed', String(enabled));
        toggle.hidden = !counter.classList.contains('visivel');
      }
      toggle.addEventListener('click', () => { originalToggle.click(); syncToggle(); });
      new MutationObserver(syncToggle).observe(status, { attributes: true, childList: true, subtree: true });
      new MutationObserver(syncToggle).observe(counter, { attributes: true, attributeFilter: ['class'] });
      syncToggle();
    }
    function update() {
      const value = Number(number.textContent.trim()) || 0;
      counter.setAttribute('data-contando', String(value > 0));
      counter.setAttribute('aria-label', 'Pacotes: ' + value);
    }
    new MutationObserver(update).observe(number, { childList: true, characterData: true, subtree: true });
    update();
    return true;
  }
  if (!initialize()) {
    const startup = new MutationObserver(() => { if (initialize()) startup.disconnect(); });
    startup.observe(document.body, { childList: true, subtree: true });
  }
})();

/* Services must be selected again after changing measurement units. */
(() => {
  function measurementMode() {
    const classes = document.body.classList;
    if (classes.contains('modo-linear-real')) return 'linear';
    if (classes.contains('calculadora-m2-sem-servicos')) return 'm2';
    if (classes.contains('modo-granel-v384')) return 'granel';
    if (classes.contains('modo-fechado-v387')) return 'fechado';
    return 'm3';
  }
  let previousMode = measurementMode();
  new MutationObserver(() => {
    const mode = measurementMode();
    if (mode === previousMode) return;
    previousMode = mode;
    ['chkEndireitamento', 'chkAplainamento'].forEach(id => {
      const checkbox = document.getElementById(id);
      if (!checkbox || !checkbox.checked) return;
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
})();
