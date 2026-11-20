import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeCashOpeningV759,normalizeCashMovementV759,projectCashBookV759} from '../public/cash-book.mjs';
import {saveCashBook,readCashBook,cashCollectionV759,cashOpeningPathV759} from '../Netlify/Funtions/lib/cash-book.mjs';
import {financeCollectionPath} from '../Netlify/Funtions/lib/finance-access.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../public/billing-access.mjs';
const id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b',payid='b28dedf2-646b-4981-b7ae-0de09b5ed6bd',id2='a2d00244-a75c-44a4-aa30-bd78176a744d',now=Date.UTC(2026,10,14,12);
const movement=(extra={})=>({id,date:'2026-11-14',direction:'in',category:'sale',amountCents:20000,description:'Recebimento da venda',partner:'Cliente',reference:'Carga 1',...extra});
const opening={date:'2026-11-01',amountCents:100000,revision:1};
const purchase=(extra={})=>({id:id2,type:'purchase',date:'2026-10-20',amountCents:50000,status:'active',partner:'Fornecedor',reference:'NF1',settlement:{payments:[{id:payid,date:'2026-11-14',amountCents:15000}]},...extra});
function setup(){
 const records=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const query=(path,filters=[],max=Infinity)=>({isQuery:true,where:(key,op,value)=>query(path,[...filters,[key,op,value]],max),limit:n=>query(path,filters,n),get:async()=>({docs:[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([key,op,v])=>op==='=='?records.get(p)[key]===v:op==='<='?records.get(p)[key]<=v:false)).slice(0,max).map(snap)})});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>query(path),runTransaction:async fn=>{db.before?.();let writing=false;const pending=[];const result=await fn({get:async ref=>{assert(!writing);return ref.isQuery?ref.get():snap(ref.path);},create:(ref,value)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,value]);},set:(ref,value)=>{writing=true;pending.push([ref.path,value]);}});for(const [path,value]of pending){records.set(path,structuredClone(value));writes.push(path);}return result;}};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true}};
}
test('cash includes actual receipts, manual outflows and paid purchases once; unpaid sales are never inferred',()=>{
 const report=projectCashBookV759({opening,movements:[{...movement(),status:'active'},{...movement({id:id2,direction:'out',category:'expense',amountCents:5000}),status:'active'}],purchases:[purchase(),purchase({id:'unknown',settlement:undefined})],from:'2026-11-01',to:'2026-11-14'});
 assert.equal(report.inCents,20000);assert.equal(report.outCents,20000);assert.equal(report.balanceCents,100000);assert.equal(report.unknownPurchases,1);assert.equal(report.rows.filter(r=>r.source.type==='purchase-payment').length,1);
 assert.equal(projectCashBookV759({movements:[{...movement(),status:'active'}],purchases:[purchase()],from:'2026-11-01',to:'2026-11-14'}).balanceCents,5000);
});
test('prior-period movements roll into opening; amounts before anchor are not counted twice; cancellation is not refund',()=>{
 const report=projectCashBookV759({opening,movements:[{...movement({date:'2026-11-02'}),status:'active'},{...movement({id:id2,date:'2026-10-01'}),status:'active'},{...movement({id:payid}),status:'cancelled'}],purchases:[purchase({status:'cancelled'})],from:'2026-11-14',to:'2026-11-14'});
 assert.equal(report.periodOpeningCents,120000);assert.equal(report.inCents,0);assert.equal(report.outCents,15000);assert.equal(report.balanceCents,105000);assert.equal(report.cancelledPaidCents,15000);assert.equal(report.cancelledRows.length,1);
 const voided=purchase();voided.settlement.payments[0].voidedAt=now;assert.equal(projectCashBookV759({opening,purchases:[voided],from:'2026-11-01',to:'2026-11-14'}).outCents,0);
 assert.equal(projectCashBookV759({opening:{...opening,date:'2026-11-10',amountCents:-1000},from:'2026-11-01',to:'2026-11-14'}).balanceCents,-1000);
});
test('opening and manual movements save with revision/idempotency and audit; cancellation cannot target purchases',async()=>{
 const s=setup(),start={companyId:'tenant',action:'opening',entry:{...opening,revision:0}};await saveCashBook(s.db,s.identity,start,now);const writeCount=s.writes.length;await saveCashBook(s.db,s.identity,start,now);assert.equal(s.writes.length,writeCount);
 const raw={companyId:'tenant',action:'movement',entry:movement()};await saveCashBook(s.db,s.identity,raw,now);const count=s.writes.length;await saveCashBook(s.db,s.identity,raw,now);assert.equal(s.writes.length,count);await assert.rejects(()=>saveCashBook(s.db,s.identity,{...raw,entry:movement({amountCents:30000})},now),/outros valores/);
 s.records.set(financeCollectionPath('tenant')+'/'+id2,purchase());let report=await readCashBook(s.db,s.identity,{from:'2026-11-01',to:'2026-11-14'},now);assert.equal(report.report.balanceCents,105000);
 await saveCashBook(s.db,s.identity,{companyId:'tenant',action:'cancel',entry:{id,revision:1}},now);report=await readCashBook(s.db,s.identity,{from:'2026-11-01',to:'2026-11-14'},now);assert.equal(report.report.balanceCents,85000);assert.equal(report.report.cancelledRows.length,1);const after=s.writes.length;await saveCashBook(s.db,s.identity,{companyId:'tenant',action:'cancel',entry:{id,revision:1}},now);assert.equal(s.writes.length,after);
 await assert.rejects(()=>saveCashBook(s.db,s.identity,{companyId:'tenant',action:'cancel',entry:{id:id2,revision:1}},now),/não encontrado/);assert.equal(s.records.get(financeCollectionPath('tenant')+'/'+id2).status,'active');assert(s.writes.every(path=>!path.includes('/dados/')));
});
test('schema, future dates, ownership, billing and concurrent opening changes reject safely',async()=>{
 assert.throws(()=>normalizeCashMovementV759(movement({amountCents:0})));assert.throws(()=>normalizeCashMovementV759(movement({direction:'out',category:'sale'})));assert.throws(()=>normalizeCashOpeningV759({...opening,date:'2026-02-30'}));
 const s=setup();await assert.rejects(()=>saveCashBook(s.db,s.identity,{companyId:'tenant',action:'movement',entry:movement({date:'2027-01-01'})},now),/futura/);await assert.rejects(()=>saveCashBook(s.db,s.identity,{companyId:'other',action:'movement',entry:movement()},now));assert.equal(s.writes.length,0);
 s.db.before=()=>s.records.set('membros/owner',{ativo:false,empresaId:'tenant'});await assert.rejects(()=>saveCashBook(s.db,s.identity,{companyId:'tenant',action:'movement',entry:movement()},now));assert.equal(s.writes.length,0);
 const billing=setup();billing.records.set('empresas/tenant/acesso/plano',billingAccessWindow(now-6*BILLING_ACCESS_DAY));assert.equal((await readCashBook(billing.db,billing.identity,{from:'2026-11-01',to:'2026-11-14'},now)).canWrite,false);await assert.rejects(()=>saveCashBook(billing.db,billing.identity,{companyId:'tenant',action:'movement',entry:movement()},now));
 const concurrent=setup();concurrent.records.set(cashOpeningPathV759('tenant'),{...opening,revision:2});await assert.rejects(()=>saveCashBook(concurrent.db,concurrent.identity,{companyId:'tenant',action:'opening',entry:{...opening,amountCents:100}},now),/mudou/);assert.equal(concurrent.writes.length,0);
});

test('daily filter carries previous cash and service receipts forward without requiring an opening',async()=>{
 const s=setup(),past={...movement({date:'2026-11-13',amountCents:5200000}),status:'active'},receipt={...movement({id:id2}),status:'active',source:{type:'log-labour-payment',receiptId:'service',paymentId:payid}};
 s.records.set(cashCollectionV759('tenant')+'/'+id,past);s.records.set(cashCollectionV759('tenant')+'/'+id2,receipt);
 const before=JSON.stringify([...s.records]),daily=(await readCashBook(s.db,s.identity,{from:'2026-11-14',to:'2026-11-14'},now)).report;
 assert.equal(daily.opening,null);assert.equal(daily.periodOpeningCents,5200000);assert.equal(daily.inCents,20000);assert.equal(daily.balanceCents,5220000);assert.equal(daily.rows.length,1);assert.equal(daily.rows[0].balanceCents,5220000);
 const monthly=(await readCashBook(s.db,s.identity,{from:'2026-11-01',to:'2026-11-14'},now)).report;assert.equal(monthly.balanceCents,daily.balanceCents);assert.equal(monthly.rows.length,2);assert.equal(JSON.stringify([...s.records]),before);assert.equal(s.writes.length,0);
 const next=projectCashBookV759({movements:[past,receipt],from:'2026-11-15',to:'2026-11-15'});assert.equal(next.periodOpeningCents,5220000);assert.equal(next.balanceCents,5220000);assert.equal(next.rows.length,0);
 const out=projectCashBookV759({movements:[past,receipt,{...movement({id:payid,direction:'out',category:'expense',amountCents:30000}),status:'active'}],from:'2026-11-14',to:'2026-11-14'});assert.equal(out.balanceCents,5190000);assert.equal(out.outCents,30000);
 assert.equal(projectCashBookV759({opening:{...opening,date:'2026-11-15'},movements:[past,receipt],from:'2026-11-14',to:'2026-11-14'}).balanceCents,null);
});
