import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('waits for asynchronous navigation, initializes once and closes across mobile tabs', () => {
  const nodes = new Map(), observers = [], classes = new Set();
  let document;
  function element(tag = 'button') {
    return { tagName: tag, attrs: {}, children: [], events: {}, disabled: false,
      setAttribute(k, v) { this.attrs[k] = v; },
      addEventListener(k, fn) { this.events[k] = fn; },
      append(...items) { this.children.push(...items); items.forEach(e => nodes.set(e.id, e)); },
      prepend(e) { this.children.unshift(e); nodes.set(e.id, e); },
      focus() { document.activeElement = this; },
      getClientRects() { return [1]; }, querySelectorAll() { return this.children; },
      closest() { return this.tagName === 'button' ? this : null; } };
  }
  const section = { id: 'inicio' };
  const media = { matches: true, addEventListener(k, fn) { this.changed = fn; } };
  document = { body: { classList: { add(c) { classes.add(c); },
    toggle(c, b) { b ? classes.add(c) : classes.delete(c); } },
    append(...items) { items.forEach(e => nodes.set(e.id, e)); } },
    events: {}, createElement: element, getElementById: id => nodes.get(id),
    querySelector: () => section, querySelectorAll: () => [section],
    addEventListener(k, fn) { this.events[k] = fn; } };
  const source = readFileSync(new URL('../ui/mobile-menu.js', import.meta.url), 'utf8');
  const context = vm.createContext({ document, window: { matchMedia: () => media },
    MutationObserver: class {
      constructor(fn) { this.callback = fn; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    } });
  vm.runInContext(source, context);
  assert.equal(nodes.has('mobileMenuToggle'), false);
  assert.equal(observers.length, 1);
  const menu = element('nav'); menu.id = 'menuLateralV525'; nodes.set(menu.id, menu);
  observers[0].callback();
  assert.equal(observers[0].disconnected, true);
  const toggle = nodes.get('mobileMenuToggle');
  assert.equal(toggle.attrs['aria-expanded'], 'false');
  vm.runInContext(source, context);
  assert.equal(nodes.get('mobileMenuToggle'), toggle);
  assert.equal(menu.children.length, 1);
  for (const tab of ['inicio', 'calculadora', 'estoque', 'cadastro', 'orcamento', 'carregamentos', 'clientes', 'configuracoes']) {
    toggle.events.click(); assert.equal(toggle.attrs['aria-expanded'], 'true');
    section.id = tab; observers[1].callback();
    nodes.get('mobileMenuBackdrop').events.click();
    assert.equal(toggle.attrs['aria-expanded'], 'false');
  }
  toggle.events.click();
  document.events.keydown({ key: 'Escape', preventDefault() {} });
  assert.equal(toggle.attrs['aria-expanded'], 'false');
  const homeScroll = { scrollTop: 340 }; nodes.set('homeScrollV492', homeScroll);
  section.id = 'inicio'; observers[1].callback();
  assert.equal(homeScroll.scrollTop, 0);
  section.id = 'estoque'; observers[1].callback(); homeScroll.scrollTop = 210;
  section.id = 'inicio'; observers[1].callback();
  assert.equal(homeScroll.scrollTop, 0);
  toggle.events.click(); media.matches = false; media.changed();
  assert.equal(classes.has('mobile-menu-open'), false);
  section.id = 'calculadora'; observers[1].callback(); homeScroll.scrollTop = 420;
  section.id = 'inicio'; observers[1].callback();
  assert.equal(homeScroll.scrollTop, 0); // PC also returns home at the top.
  assert.equal(toggle.attrs['aria-expanded'], 'false');
});
