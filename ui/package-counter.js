(() => {
  function initialize() {
    const counter = document.getElementById('miniContadorPacotes');
    const number = document.getElementById('miniNumeroPacotesM2');
    if (!counter || !number) return false;
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
