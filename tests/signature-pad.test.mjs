import test from 'node:test';
import assert from 'node:assert/strict';
import { setupSignaturePad } from '../public/signature-pad.js';

test('drawing supports touch, clearing, resize and a retry without losing strokes', () => {
  const events = {}, clearEvents = {};
  let width = 300;
  const canvas = { width: 600, height: 240,
    getContext: () => ({ clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 120 }),
    setPointerCapture() {}, addEventListener: (name, fn) => { events[name] = fn; } };
  const clear = { disabled: false, addEventListener: (name, fn) => { clearEvents[name] = fn; } };
  const read = setupSignaturePad(canvas, clear);
  const ev = (x, y, pointerId = 1) => ({ clientX: x, clientY: y, pointerId, button: 0, preventDefault() {} });
  assert.throws(read);
  events.pointerdown(ev(10, 20)); events.pointerup(ev(10, 20)); assert.throws(read);
  events.pointerdown(ev(10, 20)); events.pointermove(ev(100, 70)); events.pointerup(ev(100, 70));
  const drawing = read();
  assert.deepEqual(drawing.strokes, [[[20, 40], [200, 140]]]);
  width = 600; assert.deepEqual(read(), drawing);
  clear.disabled = true; events.pointerdown(ev(20, 20)); events.pointermove(ev(100, 20));
  assert.deepEqual(read(), drawing);
  clear.disabled = false; clearEvents.click(); assert.throws(read);
});
