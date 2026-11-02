import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadBudget } from '../Netlify/Funtions/lib/read-budget.mjs';
import { platformFailure } from '../Netlify/Funtions/lib/platform.mjs';

test('quota 8 becomes a clear quota response rather than an internal/login failure',()=>{
  const result=platformFailure({code:8,message:'Quota exceeded.',stage:'watermark'});
  assert.equal(result.status,429);assert.equal(result.body.supportCode,'FIRESTORE_QUOTA_EXCEEDED');
  assert(result.body.error.includes('cota de uso'));
});
test('concurrent reads share a request; successful results expire and writes invalidate cache',async()=>{
  let clock=0,calls=0;const budget=createReadBudget({ttlMs:30,now:()=>clock});
  const loader=async()=>({version:++calls});
  const [a,b]=await Promise.all([budget.load(loader),budget.load(loader)]);
  assert.equal(calls,1);assert.equal(a,b);
  await budget.load(loader);assert.equal(calls,1);
  budget.invalidate();await budget.load(loader);assert.equal(calls,2);
  clock=31;await budget.load(loader);assert.equal(calls,3);
});
test('quota failures pause reads without pretending quota has been restored',async()=>{
  let clock=0,calls=0;const budget=createReadBudget({cooldownMs:60,now:()=>clock});
  const loader=async()=>{calls++;throw Object.assign(Error('Quota exceeded.'),{code:8});};
  await assert.rejects(budget.load(loader));await assert.rejects(budget.load(loader));assert.equal(calls,1);
  clock=61;await assert.rejects(budget.load(loader));assert.equal(calls,2);
});
