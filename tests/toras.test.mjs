import test from 'node:test';
import assert from 'node:assert/strict';
import { volumeToras } from '../public/toras.mjs';
test('ponta fina: converts centimetres to metres and multiplies quantity without intermediate rounding', () => {
  const v = volumeToras(40, 3, 2);
  assert.ok(Math.abs(v.unitario - 0.3769911184307752) < 1e-12);
  assert.ok(Math.abs(v.total - 0.7539822368615504) < 1e-12);
  assert.ok(Math.abs(volumeToras(25.5, 4.2, 3).total - Math.PI * 0.255 ** 2 / 4 * 4.2 * 3) < 1e-12);
});
test('rejects invalid measurements, fractional quantities and overflow', () => {
  for (const args of [[0,3,1],[-1,3,1],[40,0,1],[40,3,0],[40,3,1.5],[NaN,3,1],[Infinity,3,1],['40',3,1],[1e300,1e300,1]]) assert.throws(() => volumeToras(...args), RangeError);
});
