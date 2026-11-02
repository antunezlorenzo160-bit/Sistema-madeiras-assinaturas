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

test('labor uses the species exception before the base, including explicit zero', async () => {
  const { precoMaoObraToras } = await import('../public/toras.mjs');
  const config = {base:100, especies:[{especie:'Cedrinho',preco:150},{especie:'Ipê',preco:0}]};
  assert.equal(precoMaoObraToras(config,'  CEDRINHO '),150);
  assert.equal(precoMaoObraToras(config,'ipe'),0);
  assert.equal(precoMaoObraToras(config,'Pinus'),100);
  assert.equal(precoMaoObraToras({base:null,especies:[]},'Pinus'),null);
});
test('labor rounds money at each line, using full precision volume', async () => {
  const { valorMaoObraToras } = await import('../public/toras.mjs');
  assert.equal(valorMaoObraToras(volumeToras(40,3,2).total,100),75.40);
  assert.equal(valorMaoObraToras(volumeToras(25,4,1).total,150),29.45);
  assert.equal(valorMaoObraToras(0.196349540849,0),0);
  assert.throws(()=>valorMaoObraToras(1,-1),RangeError);
});
