// PC: the launch shortcut follows the visible button in every unit/destination.
(() => {
  const numericFields = new Set(['largura','espessura','comprimento','quantidade','pacotesAdicionar','volumeGranelV384','volumeFechadoV387','granelLargura','granelComprimento','granelAltura']);
  document.addEventListener('keydown', event => {
    const space = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
    if (!space || event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
    if (!window.matchMedia('(min-width: 901px)').matches) return;
    const calculator = document.getElementById('calculadora');
    const launch = document.getElementById('btnLancar');
    if (!calculator?.classList.contains('active') || !launch || launch.disabled || launch.offsetParent === null) return;
    const target = event.target;
    if (!target || target.closest?.('dialog[open],[role="dialog"],[aria-modal="true"]')) return;
    const tag = String(target.tagName || '').toLowerCase();
    // Keep typing names, searching selects and operating checkboxes/buttons normally.
    if (target.isContentEditable || tag === 'textarea' || tag === 'select' || tag === 'button' || target.closest?.('[role="button"]')) return;
    if (tag === 'input' && (!calculator.contains(target) || !numericFields.has(target.id))) return;
    if (tag !== 'input' && tag !== 'body' && tag !== 'html' && !calculator.contains(target)) return;
    event.preventDefault();
    event.stopPropagation();
    launch.click();
  }, true);
})();
