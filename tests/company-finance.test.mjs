import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeFinanceEntry,aggregateFinance,financeCents} from '../public/company-finance.mjs';
import {financeCollectionPath,financeOwnerContext,listFinanceEntries,saveFinanceEntry,cancelFinanceEntry} from '../Netlify/Funtions/lib/company-finance.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../public/billing-access.mjs';
const now=Date.UTC(2026,10,8),uid='owner',id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b';
const sample=(extra={})=>({id,revision:0,type:'sale',date:'2026-11-07',description:'Venda Garapeira',partner:'Cliente',reference:'Carga A',category:'wood',amountCents:50000,costCents:30000,...extra});
function setup(){
 const records=new Map([['membros/'+uid,{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:uid}]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>{const filters=[];let max=Infinity;const q={where:(key,op,value)=>{filters.push([key,op,value]);return q;},orderBy:()=>q,limit:n=>{max=n;return q;},get:async()=>({docs:[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>op==='>='?records.get(p)[k]>=v:records.get(p)[k]<=v)).sort((a,b)=>records.get(b).date.localeCompare(records.get(a).date)).slice(0,max).map(snap)})};return q;},async runTransaction(fn){db.beforeTransaction?.();let writing=false;const pending=[];const result=await fn({get:async r=>{assert(!writing,'transaction reads must precede writes');return snap(r.path);},set:(r,data)=>{writing=true;pending.push([r.path,data]);},create:(r,data)=>{assert(!records.has(r.path));writing=true;pending.push([r.path,data]);}});for(const [path,data] of pending){records.set(path,structuredClone(data));writes.push(path);}return result;}};
 return {db,records,writes,identity:{uid,email:'owner@example.test',emailVerified:true}};
}
test('currency is exact cents and schema rejects unknown, invalid, zero and malformed values',()=>{
 assert.equal(financeCents('0,10'),10);assert.equal(financeCents('1500.09'),150009);for(const x of ['1.000,00','-1','1.234','Infinity','',null])assert.throws(()=>financeCents(x));
 assert.equal(normalizeFinanceEntry(sample()).amountCents,50000);
 for(const input of [sample({amountCents:0}),sample({amountCents:1.5}),sample({costCents:-1}),sample({date:null}),sample({date:'2026-02-30'}),sample({empresaId:'forged'}),sample({type:'purchase',costCents:100})])assert.throws(()=>normalizeFinanceEntry(input));
});
test('profit uses sold goods cost rather than all purchases and includes expenses and losses',()=>{
 const entries=[sample({type:'purchase',amountCents:100000,costCents:null,status:'active'}),sample({status:'active'}),sample({type:'expense',amountCents:5000,costCents:null,status:'active'}),sample({type:'loss',amountCents:2000,costCents:null,status:'active'})],before=JSON.stringify(entries);
 const result=aggregateFinance(entries,{from:'2026-11-01',to:'2026-11-30'});assert.equal(result.total.result,13000);assert.equal(result.total.purchase,100000);assert.equal(result.total.sale,50000);assert.equal(JSON.stringify(entries),before);
});
test('missing cost keeps results pending, explicit zero cost is allowed, canceled and out-of-period records do not count',()=>{
 const base=sample({status:'active',costCents:null});let r=aggregateFinance([base],{from:'2026-11-01',to:'2026-11-30'});assert.equal(r.total.result,null);assert.equal(r.total.pendingCosts,1);
 r=aggregateFinance([{...base,costCents:0},{...base,status:'cancelled'},{...base,date:'2026-10-31'}],{from:'2026-11-01',to:'2026-11-30'});assert.equal(r.total.result,50000);assert.equal(r.total.count,1);
 r=aggregateFinance([sample({type:'loss',amountCents:2000,costCents:null,status:'active'})],{from:'2026-11-01',to:'2026-11-30'});assert.equal(r.total.result,-2000);
});
test('financial server enforces canonical company owner, email, active membership and billing access',async()=>{
 for(const mode of ['employee','forged-admin','inactive','unverified']){const s=setup();if(mode==='employee')s.records.get('membros/owner').papel='employee';if(['employee','forged-admin'].includes(mode))s.records.get('empresas/tenant').ownerUid='other';if(mode==='inactive')s.records.get('membros/owner').ativo=false;if(mode==='unverified')s.identity.emailVerified=false;await assert.rejects(financeOwnerContext(s.db,s.identity),e=>e.status===403);assert.equal(s.writes.length,0);}
 const s=setup();s.records.set('empresas/tenant/acesso/plano',billingAccessWindow(now-6*BILLING_ACCESS_DAY));assert.equal((await financeOwnerContext(s.db,s.identity,undefined,false,now)).canWrite,false);await assert.rejects(saveFinanceEntry(s.db,s.identity,sample(),now),e=>e.status===403);assert.equal(s.writes.length,0);
});
test('save is tenant bound, retries are idempotent, edits are versioned and stale writes cannot overwrite',async()=>{
 const s=setup(),path=financeCollectionPath('tenant')+'/'+id;
 let r=await saveFinanceEntry(s.db,s.identity,sample(),now);assert.equal(r.entry.revision,1);assert.equal(s.records.get(path).createdBy,uid);assert.equal(s.writes.length,2);
 await saveFinanceEntry(s.db,s.identity,sample(),now+1);assert.equal(s.writes.length,2);
 await assert.rejects(saveFinanceEntry(s.db,s.identity,sample({amountCents:60000}),now+2),e=>e.status===409);assert.equal(s.records.get(path).amountCents,50000);
 r=await saveFinanceEntry(s.db,s.identity,sample({revision:1,amountCents:60000}),now+3);assert.equal(r.entry.revision,2);assert.equal(s.records.get(path+'/versoes/2').previous.amountCents,50000);assert(s.writes.every(p=>p.startsWith(financeCollectionPath('tenant')+'/')));
});
test('cancel preserves the record, removes it from results and cannot be edited back into active',async()=>{
 const s=setup();await saveFinanceEntry(s.db,s.identity,sample(),now);const r=await cancelFinanceEntry(s.db,s.identity,{id,revision:1},now+1);assert.equal(r.entry.status,'cancelled');assert.equal(r.entry.revision,2);const count=s.writes.length;await cancelFinanceEntry(s.db,s.identity,{id,revision:1},now+2);assert.equal(s.writes.length,count);
 assert.equal(aggregateFinance([r.entry],{from:'2026-11-01',to:'2026-11-30'}).total.count,0);await assert.rejects(saveFinanceEntry(s.db,s.identity,sample({revision:2}),now+3));
});
test('changed membership between authorization and transaction cannot redirect a write',async()=>{
 const s=setup();s.db.beforeTransaction=()=>{s.records.get('membros/owner').empresaId='other';s.records.set('empresas/other',{ownerUid:uid});};await assert.rejects(saveFinanceEntry(s.db,s.identity,sample(),now),e=>e.status===409);assert.equal(s.writes.length,0);
});
test('listing filters the period and never presents truncated totals; invalid periods are rejected',async()=>{
 const s=setup(),path=financeCollectionPath('tenant');s.records.set(path+'/'+id,{...sample(),status:'active',revision:1,updatedAt:now});s.records.set(path+'/old',{...sample({date:'2026-10-31'}),status:'active',updatedAt:now});let result=await listFinanceEntries(s.db,s.identity,{from:'2026-11-01',to:'2026-11-30'},now);assert.equal(result.entries.length,1);assert.equal(result.empresaId,'tenant');
 for(const range of [{from:null,to:null},{from:'2026-12-01',to:'2026-11-01'}])await assert.rejects(listFinanceEntries(s.db,s.identity,range,now),e=>e.status===400);
 for(let i=0;i<1001;i++)s.records.set(path+'/row'+i,{...sample(),updatedAt:now,status:'active'});await assert.rejects(listFinanceEntries(s.db,s.identity,{from:'2026-11-01',to:'2026-11-30'},now),e=>e.status===409);
});
test('preview records and production records use different server-controlled collections',()=>{
 assert.equal(financeCollectionPath('tenant','deploy-preview'),'empresas/tenant/financeiroPreviaRegistros');assert.equal(financeCollectionPath('tenant','production'),'empresas/tenant/financeiroRegistros');
});
test('margin and financial deficit are derived once, separate from physical material loss',()=>{
 const sale=sample({amountCents:2000000,costCents:1300000,status:'active'}),expense=sample({type:'expense',amountCents:800000,costCents:null,status:'active'}),range={from:'2026-11-01',to:'2026-11-30'};
 const total=aggregateFinance([sale,expense],range).total;assert.equal(total.grossMargin,700000);assert.equal(total.expense,800000);assert.equal(total.result,-100000);assert.equal(total.deficit,100000);assert.equal(total.profit,0);assert.equal(total.loss,0);
 const physical=sample({type:'loss',amountCents:10000,costCents:null,status:'active'}),withLoss=aggregateFinance([sale,expense,physical],range).total;assert.equal(withLoss.loss,10000);assert.equal(withLoss.result,-110000);assert.equal(withLoss.deficit,110000);
});
test('profit, break-even and pending data do not produce invented deficit figures',()=>{
 const range={from:'2026-11-01',to:'2026-11-30'},sale=sample({amountCents:2000000,costCents:1300000,status:'active'}),expense=amount=>sample({type:'expense',amountCents:amount,costCents:null,status:'active'});
 let total=aggregateFinance([sale,expense(68000)],range).total;assert.equal(total.profit,632000);assert.equal(total.deficit,0);
 total=aggregateFinance([sale,expense(700000)],range).total;assert.equal(total.profit,0);assert.equal(total.deficit,0);assert.equal(total.result,0);
 total=aggregateFinance([{...sale,costCents:null},expense(800000)],range).total;assert.equal(total.grossMargin,null);assert.equal(total.profit,null);assert.equal(total.deficit,null);
});
test('period profit and deficit use the net result, not the sum of signs from different months',()=>{
 const entries=[sample({date:'2026-10-07',status:'active',amountCents:100000,costCents:0}),sample({date:'2026-11-07',type:'expense',status:'active',amountCents:40000,costCents:null})],r=aggregateFinance(entries,{from:'2026-10-01',to:'2026-11-30'});
 assert.equal(r.rows[0].profit,100000);assert.equal(r.rows[1].deficit,40000);assert.equal(r.total.result,60000);assert.equal(r.total.profit,60000);assert.equal(r.total.deficit,0);
});
