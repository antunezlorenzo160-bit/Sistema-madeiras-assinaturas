import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import { validateSignature } from '../Netlify/Funtions/lib/signature-validation.mjs';

test('signature is saved atomically with receipt and rejected for wrong code or missing drawing', async () => {
  const source = readFileSync(new URL('../Netlify/Funtions/assinatura-entrega.mjs', import.meta.url), 'utf8')
    .replace(/^import .*;\n/gm, '').replace('export default async function', 'async function');
  const ctx = vm.createContext({ ...crypto, Buffer, validateSignature });
  vm.runInContext(source, ctx);
  const sign = vm.runInContext('signDelivery', ctx);
  const key = Buffer.alloc(32, 7), token = 'a'.repeat(43), inviteId = 'invite';
  const tokenPath = 'sm2_entrega_tokens/' + crypto.createHash('sha256').update(token).digest('hex');
  const invitePath = 'empresas/company/dados/sm2_entrega_assinaturas/registros/invite';
  const orderPath = 'empresas/company/dados/sm2_orcamentos_guardados/registros/order';
  const records = new Map([
    [tokenPath, { empresaId: 'company', inviteId, status: 'pending' }],
    [invitePath, { empresaId: 'company', orderId: 'order', status: 'pending', attempts: 0,
      codeHash: crypto.createHmac('sha256', key).update('invite:12345678').digest('hex') }],
    [orderPath, { status: 'entregue', assinaturaStatus: 'pendente' }],
  ]);
  const snap = path => ({ exists: records.has(path), data: () => records.get(path) });
  const db = { doc: path => ({ path, get: async () => snap(path) }),
    runTransaction: async fn => {
      const writes = [];
      const result = await fn({ get: async ref => snap(ref.path), update: (ref, data) => writes.push([ref.path, data]) });
      for (const [path, data] of writes) records.set(path, { ...records.get(path), ...data });
      return result;
    } };
  const input = { db, key, token, code: '12345678', recipientName: ' Cliente Teste ',
    signature: { width: 600, height: 240, strokes: [[[10, 20], [100, 80]]] } };
  await assert.rejects(sign({ ...input, code: '00000000' }), /Código incorreto/);
  assert.equal(records.get(invitePath).attempts, 1);
  assert.equal(records.get(orderPath).assinaturaStatus, 'pendente');
  await assert.rejects(sign({ ...input, signature: undefined }), /Desenhe/);
  assert.equal(records.get(orderPath).assinaturaStatus, 'pendente');
  assert.equal((await sign(input)).ok, true);
  const order = records.get(orderPath);
  assert.equal(order.assinaturaStatus, 'assinado');
  assert.equal(order.assinadoPor, 'Cliente Teste');
  assert.deepEqual(order.assinaturaDesenho, validateSignature(input.signature));
  assert.equal(records.get(invitePath).status, 'signed');
  assert.equal(records.get(tokenPath).status, 'signed');
  assert.equal((await sign(input)).alreadySigned, true);
  assert.equal(records.get(orderPath).assinadoEm, order.assinadoEm);
});
