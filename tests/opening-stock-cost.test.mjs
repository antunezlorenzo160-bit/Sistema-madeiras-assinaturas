import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeOpeningStockCost} from '../public/opening-stock-cost.mjs';
import {readOpeningStockCost,saveOpeningStockCost,openingStockCostPath} from '../Netlify/Funtions/lib/opening-stock-cost.mjs';
import {financeCollectionPath} from '../Netlify/Funtions/lib/finance-access.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../public/billing-access.mjs';
const now=Date.UTC(2026,10,8,18),input={companyId:'tenant',unitCents:100000,revision:0};
function setup(){const records=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}]]),writes=[];const snap=path=>({exists:records.has(path),data:()=>structuredClone(records.get(path))});const db={doc:path=>({path,get:async()=>snap(path)}),async runTransaction(fn){db.beforeTransaction?.();const pending=[];let writing=false;const result=await fn({get:async ref=>{assert(!writing);return snap(ref.path);},set:(ref,v)=>{writing=true;pending.push([ref.path,v]);},create:(ref,v)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,v]);}});for(const [p,v] of pending){records.set(p,structuredClone(v));writes.push(p);}return result;}};return {db,records,writes,identity:{uid:'owner',emailVerified:true}};}
test('old valuation is explicit, scoped, audited and idempotent without a ledger, stock or purchase write',async()=>{
 const s=setup();assert.equal((await readOpeningStockCost(s.db,'tenant')).unitCents,null);const r=await saveOpeningStockCost(s.db,s.identity,input,now);assert.deepEqual(r.policy,{unitCents:100000,cutoffAt:now,revision:1});assert.equal(s.writes.length,2);assert(s.writes.every(p=>p.startsWith(openingStockCostPath('tenant'))));assert(openingStockCostPath('tenant').startsWith(financeCollectionPath('tenant')));await saveOpeningStockCost(s.db,s.identity,input,now+1000);assert.equal(s.writes.length,2);
 await assert.rejects(saveOpeningStockCost(s.db,s.identity,{...input,unitCents:120000},now+2000),e=>e.status===409);
 const next=await saveOpeningStockCost(s.db,s.identity,{...input,revision:1,unitCents:120000},now+3000);assert.equal(next.policy.cutoffAt,now);assert.equal(next.policy.unitCents,120000);
 const disabled=await saveOpeningStockCost(s.db,s.identity,{...input,revision:2,unitCents:null},now+4000);assert.equal(disabled.policy.cutoffAt,now);assert.equal(disabled.policy.unitCents,null);
});
test('employee, unverified user, foreign screen, tenant swap and readonly plan cannot value stock',async()=>{
 for(const mode of ['employee','unverified','foreign','swap','readonly']){const s=setup();if(mode==='employee')s.records.get('empresas/tenant').ownerUid='other';if(mode==='unverified')s.identity.emailVerified=false;if(mode==='swap')s.db.beforeTransaction=()=>{s.records.get('membros/owner').empresaId='other';s.records.set('empresas/other',{ownerUid:'owner'});};if(mode==='readonly')s.records.set('empresas/tenant/acesso/plano',billingAccessWindow(now-6*BILLING_ACCESS_DAY));await assert.rejects(saveOpeningStockCost(s.db,s.identity,{...input,companyId:mode==='foreign'?'foreign':'tenant'},now));assert.equal(s.writes.length,0);}
 for(const v of [0,-1,0.5,Infinity])assert.throws(()=>normalizeOpeningStockCost({unitCents:v}));
 const s=setup();await assert.rejects(saveOpeningStockCost(s.db,s.identity,{...input,cutoffAt:1},now),e=>e.status===400);
});
