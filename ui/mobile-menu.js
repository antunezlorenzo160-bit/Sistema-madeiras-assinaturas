(() => {
  const menu = document.getElementById('menuLateralV525');
  if (!menu || document.getElementById('mobileMenuToggle')) return;
  const mobile = window.matchMedia('(max-width:760px)');
  const toggle = document.createElement('button');
  toggle.id = 'mobileMenuToggle'; toggle.type = 'button';
  toggle.setAttribute('aria-controls', menu.id);
  const backdrop = document.createElement('div');
  backdrop.id = 'mobileMenuBackdrop'; backdrop.setAttribute('aria-hidden', 'true');
  const close = document.createElement('button');
  close.id = 'mobileMenuClose'; close.type = 'button'; close.textContent = 'Fechar menu ✕';
  menu.prepend(close); document.body.append(backdrop, toggle);
  let opened = false;
  function setOpen(value, restoreFocus = false) {
    opened = Boolean(value && mobile.matches);
    document.body.classList.toggle('mobile-menu-open', opened);
    toggle.setAttribute('aria-expanded', String(opened));
    toggle.setAttribute('aria-label', opened ? 'Fechar menu' : 'Abrir menu');
    toggle.textContent = opened ? '✕ Fechar' : '☰ Menu';
    if (opened) close.focus({ preventScroll: true });
    else if (restoreFocus && mobile.matches) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', () => setOpen(!opened, true));
  close.addEventListener('click', () => setOpen(false, true));
  backdrop.addEventListener('click', () => setOpen(false, true));
  menu.addEventListener('click', event => {
    if (event.target.closest('button,a')) setOpen(false, true);
  });
  document.addEventListener('keydown', event => {
    if (!opened) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
    if (event.key !== 'Tab') return;
    const buttons = [...menu.querySelectorAll('button,a[href],[tabindex="0"]'), toggle]
      .filter(element => !element.disabled && element.getClientRects().length);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  // Navigation can also happen through home shortcuts, history, or other controls.
  let active = document.querySelector('section.tab.active')?.id;
  const observer = new MutationObserver(() => {
    const next = document.querySelector('section.tab.active')?.id;
    if (next !== active) { active = next; setOpen(false); }
  });
  for (const section of document.querySelectorAll('section.tab')) {
    observer.observe(section, { attributes: true, attributeFilter: ['class'] });
  }
  mobile.addEventListener('change', () => setOpen(false));
  document.body.classList.add('mobile-menu-ready');
  setOpen(false);
})();
