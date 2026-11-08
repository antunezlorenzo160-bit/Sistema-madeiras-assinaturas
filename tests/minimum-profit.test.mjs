import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeMinimumProfitPolicy,minimumProfitPercentInput,expectedMinimumProfit,evaluateMinimumProfit,assessMinimumProfitPeriod} from '../public/minimum-profit.mjs';
import {saveMinimumProfitPolicy,readMinimumProfitPolicy,minimumProfitPolicyPath} from '../Netlify/Funtions/lib/minimum-profit.mjs';
import {financeCollectionPath} from '../Netlify/Funtions/lib/finance-access.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../public/billing-access.mjs';
const policy={minimumBasisPoints:2000,revision:1},sale=(extra={})=>({type:'sale',status:'active',amountCents:12000,costCents:10000,...extra}),now=Date.UTC(2026,10,8);
test('defaults do not activate a target and percentage parsing uses the cost as reference',()=>{
 assert.deepEqual(normalizeMinimumProfitPolicy(),{minimumBasisPoints:null,revision:0});assert.equal(minimumProfitPercentInput(''),null);assert.equal(minimumProfitPercentInput('20'),2000);assert.equal(minimumProfitPercentInput('20,50'),2050);assert.equal(expectedMinimumProfit(10000,2000),2000);
 for(const value of ['-1','20%','20.005','1001','Infinity'])assert.throws(()=>minimumProfitPercentInput(value));
});
test('a profitable sale below target warns, equality meets it and no price or record is changed',()=>{
 const entry=sale({amountCents:11000}),before=JSON.stringify(entry),check=evaluateMinimumProfit(entry,policy);assert.equal(check.status,'below');assert.equal(check.grossCents,1000);assert.equal(check.requiredCents,2000);assert.equal(check.minimumSaleCents,12000);assert.equal(check.shortfallCents,1000);assert.equal(JSON.stringify(entry),before);
 assert.equal(evaluateMinimumProfit(sale(),policy).status,'met');assert.equal(evaluateMinimumProfit(sale({amountCents:12500}),policy).status,'met');
});
test('cost pending, duplicate review, canceled records, zero cost and disabled target are handled explicitly',()=>{
 assert.equal(evaluateMinimumProfit(sale({costCents:null}),policy).status,'pending-cost');assert.equal(evaluateMinimumProfit(sale({status:'pending-review'}),policy).status,'pending-review');assert.equal(evaluateMinimumProfit(sale({status:'cancelled'}),policy).status,'ignored');assert.equal(evaluateMinimumProfit(sale(),{}).status,'disabled');
 const free=evaluateMinimumProfit(sale({costCents:0,amountCents:100}),policy);assert.equal(free.status,'met');assert.equal(free.actualPercent,null);assert.equal(free.minimumSaleCents,0);
});
test('minimum is rounded upward to cents using exact integer math',()=>{
 assert.equal(expectedMinimumProfit(10001,2000),2001);assert.equal(expectedMinimumProfit(1,1),1);assert.equal(evaluateMinimumProfit(sale({costCents:10001,amountCents:12001}),policy).status,'below');assert.equal(evaluateMinimumProfit(sale({costCents:10001,amountCents:12002}),policy).status,'met');assert.equal(expectedMinimumProfit(100000000000,100000),1000000000000);
});
test('period result considers expenses while individual warning compares sale and wood cost',()=>{
 const entry=sale({amountCents:13000}),result=assessMinimumProfitPeriod([entry],{result:1500},policy);assert.equal(evaluateMinimumProfit(entry,policy).status,'met');assert.equal(result.requiredCents,2000);assert.equal(result.periodBelow,true);assert.equal(result.shortfallCents,500);
 const pending=assessMinimumProfitPeriod([entry,sale({costCents:null})],{result:null},policy);assert.equal(pending.requiredCents,null);assert.equal(pending.periodBelow,null);assert.equal(pending.pendingCount,1);
});
test('one low sale is flagged even when another sale covers its shortfall in the period',()=>{
 const result=assessMinimumProfitPeriod([sale({amountCents:11000}),sale({amountCents:14000})],{result:5000},policy);assert.equal(result.belowCount,1);assert.equal(result.periodBelow,false);assert.equal(result.requiredCents,4000);
});
function setup(){
 const records=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}]]),writes=[];
 const snapshot=path=>({exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const db={doc:path=>({path,get:async()=>snapshot(path)}),async runTransaction(fn){db.beforeTransaction?.();const pending=[];let writing=false;const result=await fn({get:async ref=>{assert(!writing);return snapshot(ref.path);},set:(ref,v)=>{writing=true;pending.push([ref.path,v]);},create:(ref,v)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,v]);}});for(const [path,value] of pending){records.set(path,structuredClone(value));writes.push(path);}return result;}};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true}};
}
test('policy is company-scoped, versioned and idempotent; it does not write to prices or ledger records',async()=>{
 const s=setup();assert.equal((await readMinimumProfitPolicy(s.db,'tenant')).minimumBasisPoints,null);const request={minimumBasisPoints:2000,revision:0};let result=await saveMinimumProfitPolicy(s.db,s.identity,request,now);assert.equal(result.policy.revision,1);const count=s.writes.length;await saveMinimumProfitPolicy(s.db,s.identity,request,now+1);assert.equal(s.writes.length,count);
 assert(s.writes.every(path=>path.startsWith(minimumProfitPolicyPath('tenant'))));assert(minimumProfitPolicyPath('tenant').startsWith(financeCollectionPath('tenant')+'MargemMinima/'));
 await assert.rejects(saveMinimumProfitPolicy(s.db,s.identity,{minimumBasisPoints:3000,revision:0},now+2),e=>e.status===409);
 result=await saveMinimumProfitPolicy(s.db,s.identity,{minimumBasisPoints:null,revision:1},now+3);assert.equal(result.policy.minimumBasisPoints,null);assert.equal(result.policy.revision,2);
});
test('employee, unverified identity, foreign owner, readonly plan or tenant swap cannot write the target',async()=>{
 for(const mode of ['employee','unverified','readonly','swap']){
  const s=setup();if(mode==='employee')s.records.get('empresas/tenant').ownerUid='other';if(mode==='unverified')s.identity.emailVerified=false;if(mode==='readonly')s.records.set('empresas/tenant/acesso/plano',billingAccessWindow(now-6*BILLING_ACCESS_DAY));if(mode==='swap')s.db.beforeTransaction=()=>{s.records.get('membros/owner').empresaId='other';s.records.set('empresas/other',{ownerUid:'owner'});};
  await assert.rejects(saveMinimumProfitPolicy(s.db,s.identity,{minimumBasisPoints:2000,revision:0},now));assert.equal(s.writes.length,0);
 }
 const s=setup();await assert.rejects(saveMinimumProfitPolicy(s.db,s.identity,{minimumBasisPoints:2000,revision:0,empresaId:'forged'},now),e=>e.status===400);assert.equal(s.writes.length,0);
});
