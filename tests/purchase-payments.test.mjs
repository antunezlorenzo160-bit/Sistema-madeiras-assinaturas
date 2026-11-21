import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePurchasePaymentV757,purchaseSettlementV757,purchaseAccountsV757} from '../public/purchase-payments.mjs';
import {savePurchasePayment,listPurchaseAccounts} from '../Netlify/Funtions/lib/purchase-payments.mjs';
import {financeCollectionPath} from '../Netlify/Funtions/lib/finance-access.mjs';
import {aggregateFinance} from '../public/company-finance.mjs';
import {normalizeStockPurchase} from '../public/stock-purchase.mjs';import {normalizeLogPurchaseV756} from '../public/log-purchase.mjs';
const id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b',op='b28dedf2-646b-4981-b7ae-0de09b5ed6bd',op2='a2d00244-a75c-44a4-aa30-bd78176a744d',now=Date.UTC(2026,10,14,12),date='2026-10-01';
const payment=(extra={})=>({mode:'partial',paidCents:4000,paidDate:date,dueDate:'2026-11-20',...extra});
const entry=(extra={})=>({id,revision:1,type:'purchase',date,amountCents:10000,status:'active',source:{type:'stock-purchase',receiptId:op},...extra});
function setup(row=entry()){
 const records=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}],[financeCollectionPath('tenant')+'/'+id,row]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const query=(path,filters=[],limit=Infinity)=>({where:(k,op,v)=>query(path,[...filters,[k,op,v]],limit),limit:n=>query(path,filters,n),get:async()=>({docs:[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>op==='=='&&records.get(p)[k]===v)).slice(0,limit).map(snap)})});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>query(path),runTransaction:async fn=>{let writing=false;const pending=[];const result=await fn({get:async ref=>{assert(!writing);return snap(ref.path);},set:(ref,data)=>{writing=true;pending.push([ref.path,data]);},create:(ref,data)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,data]);}});for(const [path,data]of pending){records.set(path,structuredClone(data));writes.push(path);}return result;}};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true}};
}
const request=(extra={})=>({companyId:'tenant',entryId:id,revision:1,operationId:op,action:'initialize',payment:payment(),...extra});
test('cash, credit and partial terms validate exact amounts and dates without guessing legacy payment',()=>{
 assert.equal(normalizePurchasePaymentV757(payment({mode:'cash'}),10000,date).paidCents,10000);assert.equal(normalizePurchasePaymentV757(payment({mode:'credit'}),10000,date).paidCents,0);assert.equal(normalizePurchasePaymentV757(payment(),10000,date).paidCents,4000);
 for(const p of [payment({paidCents:10001}),payment({paidCents:0}),payment({dueDate:'bad'}),payment({paidDate:'2026-09-30'}),{}])assert.throws(()=>normalizePurchasePaymentV757(p,10000,date));
 const report=purchaseAccountsV757([entry()],{from:'2026-11-01',to:'2026-11-14'});assert.equal(report.unknownCount,1);assert.equal(report.payableCents,0);assert.equal(report.paidInPeriodCents,0);
});
test('partial payments are idempotent across periods and preserve purchase amount, profit and source',async()=>{
 const s=setup(),first=await savePurchasePayment(s.db,s.identity,request(),now);assert.equal(first.entry.amountCents,10000);assert.equal(first.entry.revision,2);assert.equal(s.writes.length,3);await savePurchasePayment(s.db,s.identity,request(),now);assert.equal(s.writes.length,3);
 const next={...request(),action:'pay',operationId:op2,revision:2,date:'2026-11-14',amountCents:3000};delete next.payment;const second=await savePurchasePayment(s.db,s.identity,next,now);assert.equal(second.entry.source.type,'stock-purchase');assert.equal(second.entry.amountCents,10000);assert.equal(second.entry.settlement.payments.length,2);
 const report=await listPurchaseAccounts(s.db,s.identity,{from:'2026-11-01',to:'2026-11-14'},now);assert.equal(report.report.paidInPeriodCents,3000);assert.equal(report.report.payableCents,3000);assert.equal(report.report.overdueCents,0);assert.equal(report.report.rows.length,1);
 const before=aggregateFinance([entry()],{from:'2026-10-01',to:'2026-10-31'}).total,after=aggregateFinance([second.entry],{from:'2026-10-01',to:'2026-10-31'}).total;assert.deepEqual(after,before);
 await assert.rejects(()=>savePurchasePayment(s.db,s.identity,{...next,amountCents:1000},now),/outros valores/);
 await assert.rejects(()=>savePurchasePayment(s.db,s.identity,{...next,operationId:'931b625b-64d5-43bf-865e-d1bdf159f021',revision:3,amountCents:4000},now),/restante/);
 await assert.rejects(()=>savePurchasePayment(s.db,s.identity,{...next,operationId:'931b625b-64d5-43bf-865e-d1bdf159f021'},now),/mudou/);
});
test('annulling erroneous payment preserves audit; cancelled purchase does not invent cash refund',async()=>{
 const settlement=purchaseSettlementV757({id,date,totalCents:10000,payment:payment({mode:'cash'})},now,'owner'),s=setup(entry({settlement}));
 let report=purchaseAccountsV757([entry({settlement,status:'cancelled'})],{from:'2026-10-01',to:'2026-11-14'});assert.equal(report.paidInPeriodCents,10000);assert.equal(report.cancelledPaidCents,10000);assert.equal(report.payableCents,0);
 const result=await savePurchasePayment(s.db,s.identity,request({action:'void',paymentId:id}),now);assert(result.entry.settlement.payments[0].voidedAt);report=purchaseAccountsV757([result.entry],{from:date,to:'2026-11-14'});assert.equal(report.paidInPeriodCents,0);assert.equal(report.payableCents,10000);
});
test('ownership, company, future date and purchase-only checks protect payment writes',async()=>{
 for(const change of [s=>s.identity.uid='employee',s=>s.identity.emailVerified=false,s=>s.records.set('empresas/tenant',{ownerUid:'other'})]){const s=setup();change(s);await assert.rejects(()=>savePurchasePayment(s.db,s.identity,request(),now));assert.equal(s.writes.length,0);}
 const s=setup();await assert.rejects(()=>savePurchasePayment(s.db,s.identity,request({companyId:'other'}),now));await assert.rejects(()=>savePurchasePayment(s.db,s.identity,request({payment:payment({paidDate:'2027-01-01'})}),now),/futura/);assert.equal(s.writes.length,0);
 const sale=setup(entry({type:'sale'}));await assert.rejects(()=>savePurchasePayment(sale.db,sale.identity,request(),now));assert.equal(sale.writes.length,0);
});
test('all units and logs normalize terms without changing physical quantities or cost',()=>{
 const uuid2=op,base={companyId:'tenant',id,date,supplier:'Fornecedor',reference:'',freightCents:0,otherCents:0,freightIncluded:false,otherIncluded:false};
 for(const kind of ['m3','m2','linear','granel']){
  const line={id:uuid2,madeiraId:'wood',tipoMedida:kind,largura:kind==='m3'?100:kind==='m2'?20:0,espessura:kind==='m3'?100:0,comprimento:['m3','m2'].includes(kind)?1:0,quantidade:kind==='linear'?0:kind==='granel'?2:10,volume:kind==='m3'?10:kind==='m2'?2:kind==='linear'?70:2,estadoMadeira:'seca',unitCents:1000,...(kind==='linear'?{produto:'Ripa',linearTotalV744:true}:{})};
  const legacy=normalizeStockPurchase({...base,stock:'estoque1',lines:[line]}),paid=normalizeStockPurchase({...base,stock:'estoque1',lines:[line],payment:payment({mode:'cash'})});assert.equal(legacy.payment,undefined);assert.equal(paid.payment.paidCents,paid.totalCents);assert.deepEqual(legacy.lines,paid.lines);
 }
 const logs=normalizeLogPurchaseV756({...base,lines:[{id:uuid2,especie:'Pinus',diametro:30,comprimento:5,quantidade:21,unitCents:5000}],payment:payment({mode:'credit'})});assert.equal(logs.payment.paidCents,0);assert.equal(logs.totalQuantity,21);
});
test('third payment closes the exact reported balance and retry never records a fourth payment',async()=>{
 const s=setup(entry({date:'2026-11-14',amountCents:467557})),start=request({payment:payment({paidCents:10000,paidDate:'2026-11-14',dueDate:'2026-11-14'})});await savePurchasePayment(s.db,s.identity,start,now);
 const second={companyId:'tenant',entryId:id,revision:2,operationId:op2,action:'pay',date:'2026-11-14',amountCents:300000};await savePurchasePayment(s.db,s.identity,second,now);
 const third={...second,revision:3,operationId:'931b625b-64d5-43bf-865e-d1bdf159f021',amountCents:157557},result=await savePurchasePayment(s.db,s.identity,third,now),report=purchaseAccountsV757([result.entry],{from:'2026-11-14',to:'2026-11-14'});
 assert.equal(result.entry.settlement.payments.length,3);assert.equal(report.paidInPeriodCents,467557);assert.equal(report.payableCents,0);assert.equal(report.rows[0].paidCents,467557);const writes=s.writes.length;await savePurchasePayment(s.db,s.identity,third,now);assert.equal(s.writes.length,writes);
 await assert.rejects(()=>savePurchasePayment(s.db,s.identity,{...third,revision:4,operationId:'a3b1ea61-b24a-4594-8892-05db7b0178e7',amountCents:1},now),/restante/);
});
