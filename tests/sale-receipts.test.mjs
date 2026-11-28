import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {financeDbV804} from './fixtures/finance-db.mjs';
import {financeCollectionPath} from '../Netlify/Funtions/lib/finance-access.mjs';
import {listSaleReceipts,saveSaleReceipt,saleReceiptPathV807,saleReceiptSignatureV807,confirmPromissoriaPayment,readPromissoriaPayment,readPromissoriaPaymentOptions,linkExistingPromissoriaPayment} from '../Netlify/Funtions/lib/sale-receipts.mjs';
import {readCashBook} from '../Netlify/Funtions/lib/cash-book.mjs';
import {loadSaleKeys} from '../Netlify/Funtions/lib/load-sales.mjs';
import {aggregateFinance} from '../public/company-finance.mjs';
const now=Date.UTC(2026,10,20,12),range={from:'2026-11-01',to:'2026-11-20'},id=randomUUID(),manual={id,type:'sale',date:'2026-11-10',amountCents:100000,costCents:40000,description:'Venda madeira',partner:'Cliente',reference:'',status:'active',revision:1};
const setup=()=>financeDbV804([[financeCollectionPath('tenant')+'/'+id,manual]]);
const request=(row,extra={})=>({companyId:'tenant',entryId:row.id,revision:row.revision,operationId:randomUUID(),saleDate:row.date,loadId:row.source?.loadId||null,signature:row.receiptSignature,acknowledged:true,action:'initialize',payment:{mode:'credit',dueDate:'2026-11-30',paidDate:null,paidCents:0},...extra});
async function row(s){return (await listSaleReceipts(s.db,s.identity,range,now)).report.rows[0];}
async function cash(s){return (await readCashBook(s.db,s.identity,{from:'2026-11-20',to:'2026-11-20'},now)).report;}
test('unconfirmed wood sales are unknown; credit stays receivable and receipts enter cash once without a second sale',async()=>{
 const s=setup(),before=JSON.stringify(s.records.get(financeCollectionPath('tenant')+'/'+id));let r=await row(s);assert(r.paymentUnknown);assert.equal(s.writes.length,0);assert.equal((await cash(s)).balanceCents,0);
 const init=request(r);await saveSaleReceipt(s.db,s.identity,init,now);assert.equal((await cash(s)).balanceCents,0);r=await row(s);assert.equal(r.receivableCents,100000);
 const pay=request(r,{action:'pay',date:'2026-11-19',amountCents:20000});delete pay.payment;await saveSaleReceipt(s.db,s.identity,pay,now);const count=s.writes.length;await saveSaleReceipt(s.db,s.identity,pay,now);assert.equal(s.writes.length,count);r=await row(s);assert.equal(r.receivableCents,80000);
 const c=await cash(s);assert.equal(c.periodOpeningCents,20000);assert.equal(c.inCents,0);assert.equal(c.balanceCents,20000);assert.equal(JSON.stringify(s.records.get(financeCollectionPath('tenant')+'/'+id)),before);
 assert.equal(aggregateFinance([manual],range).total.sale,100000);
 await assert.rejects(()=>saveSaleReceipt(s.db,s.identity,request(r,{action:'pay',date:'2026-11-20',amountCents:80001}),now),/restante/);
 const remaining=request(r,{action:'pay',date:'2026-11-20',amountCents:80000});delete remaining.payment;await saveSaleReceipt(s.db,s.identity,remaining,now);assert.equal((await cash(s)).balanceCents,100000);assert.equal((await cash(s)).inCents,80000);
 r=await row(s);await saveSaleReceipt(s.db,s.identity,request(r,{action:'void',paymentId:pay.operationId}),now);assert.equal((await cash(s)).balanceCents,80000);assert.equal((await row(s)).receivableCents,20000);
});
test('cash and partial confirmations count actual dated receipts, retries are stable and cancelled sale keeps receipt evidence',async()=>{
 for(const mode of ['cash','partial']){const s=setup(),r=await row(s),input=request(r,{payment:{mode,dueDate:'2026-11-30',paidDate:'2026-11-20',paidCents:30000}});await saveSaleReceipt(s.db,s.identity,input,now);await saveSaleReceipt(s.db,s.identity,input,now);assert.equal((await cash(s)).balanceCents,mode==='cash'?100000:30000);
 await assert.rejects(()=>saveSaleReceipt(s.db,s.identity,{...input,payment:{...input.payment,paidCents:40000}},now),/outros valores/);
 s.records.set(financeCollectionPath('tenant')+'/'+id,{...manual,status:'cancelled'});assert.equal((await cash(s)).balanceCents,mode==='cash'?100000:30000);
 }
});
test('load sales are read from original fully deducted rows and source changes reject before writing',async()=>{
 const at=Date.UTC(2026,10,10,12),gid='load-example',path='empresas/tenant/dados/sm2_carregamentos/registros/a',item={grupoCargaId:gid,cargaStatus:'concluido',cargaBaixadaEm:at,atualizadoEm:at,valor:52000,quantidade:46,volume:10.12,tipoMedida:'m3',madeiraId:'wood'},s=financeDbV804([[path,item]]);let r=await row(s);assert.equal(r.id,loadSaleKeys(gid).entryId);assert.equal(r.amountCents,5200000);
 const input=request(r,{payment:{mode:'cash',paidDate:'2026-11-10',paidCents:0}});await saveSaleReceipt(s.db,s.identity,input,now);assert.equal((await cash(s)).periodOpeningCents,5200000);assert.equal((await cash(s)).balanceCents,5200000);assert.equal(s.records.get(path).quantidade,46);
 s.records.set(path,{...item,valor:53000});r=await row(s);assert(r.receiptChanged);const count=s.writes.length;await assert.rejects(()=>saveSaleReceipt(s.db,s.identity,request(r,{action:'due',dueDate:'2026-12-01'}),now),/mudou/);assert.equal(s.writes.length,count);
});
test('ownership, company, concurrent revision, future date and log service protections preserve records',async()=>{
 const s=setup(),r=await row(s),base=request(r),count=s.writes.length;
 for(const extra of [{companyId:'other'},{acknowledged:false},{revision:1},{payment:{mode:'cash',paidDate:'2026-12-01'}},{signature:'0'.repeat(64)}])await assert.rejects(()=>saveSaleReceipt(s.db,s.identity,{...base,...extra},now));assert.equal(s.writes.length,count);
 const service={...manual,source:{type:'log-labour',serviceCents:100000,woodCents:0}};s.records.set(financeCollectionPath('tenant')+'/'+id,service);assert.equal((await listSaleReceipts(s.db,s.identity,range,now)).report.rows.length,0);await assert.rejects(()=>saveSaleReceipt(s.db,s.identity,{...base,signature:saleReceiptSignatureV807(service)},now));
 s.records.set('empresas/tenant',{ownerUid:'another-owner'});s.records.set('membros/owner',{ativo:true,empresaId:'tenant',papel:'employee'});await assert.rejects(()=>listSaleReceipts(s.db,s.identity,range,now));assert.equal(s.writes.length,count);
});
test('two devices cannot initialize or over-receive the same sale concurrently',async()=>{
 const s=setup(),r=await row(s),a=request(r,{payment:{mode:'cash',paidDate:'2026-11-20'}}),b=request(r,{payment:{mode:'cash',paidDate:'2026-11-20'}}),results=await Promise.allSettled([saveSaleReceipt(s.db,s.identity,a,now),saveSaleReceipt(s.db,s.identity,b,now)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await cash(s)).balanceCents,100000);assert.equal([...s.records.keys()].filter(k=>k.startsWith(saleReceiptPathV807('tenant')+'/')&&!k.slice((saleReceiptPathV807('tenant')+'/').length).includes('/')).length,1);
});

test('promissory installments reuse sale receipts and credit cash at most once per installment',async()=>{
 const at=Date.UTC(2026,10,10,12),loadId='parcel-load',path='empresas/tenant/dados/sm2_carregamentos/registros/a';
 const item={grupoCargaId:loadId,cargaStatus:'concluido',cargaBaixadaEm:at,atualizadoEm:at,valor:1000,quantidade:10,volume:2,tipoMedida:'m3',madeiraId:'wood'};
 const s=financeDbV804([[path,item]]);
 const base={empresaId:'tenant',loadId,date:'2026-11-20',dueDate:'2026-12-31'};
 assert.equal(await readPromissoriaPayment(s.db,'tenant',loadId,1),null);
 const payments=await Promise.all([1,1].map(numero=>confirmPromissoriaPayment(s.db,s.identity,{...base,numero,amountCents:60000},now)));
 assert.deepEqual(payments[0],payments[1]);
 assert.equal((await cash(s)).balanceCents,60000);
 assert.equal((await cash(s)).rows[0].description,'Promissória · parcela 1');
 assert.equal((await row(s)).receivableCents,40000);
 assert.equal(await readPromissoriaPayment(s.db,'tenant',loadId,2),null);
 await assert.rejects(()=>confirmPromissoriaPayment(s.db,s.identity,{...base,numero:2,amountCents:40001},now),/restante/);
 await assert.rejects(()=>confirmPromissoriaPayment(s.db,s.identity,{...base,date:'2026-11-21',numero:2,amountCents:20000},now),/futura/);
 for(const numero of [2,3])await confirmPromissoriaPayment(s.db,s.identity,{...base,numero,amountCents:20000},now);
 assert.equal((await cash(s)).balanceCents,100000);
 assert.equal((await cash(s)).rows.length,3);
 assert.equal((await row(s)).receivableCents,0);
 assert.deepEqual(s.records.get(path),item);
 const r=await row(s);
 const paymentId=r.settlement.payments[0].id;
 await saveSaleReceipt(s.db,s.identity,request(r,{action:'void',paymentId}),now);
 assert.equal((await cash(s)).balanceCents,40000);
 assert.equal((await readPromissoriaPayment(s.db,'tenant',loadId,1)).voided,true);
 await assert.rejects(()=>confirmPromissoriaPayment(s.db,s.identity,{...base,numero:1,amountCents:60000},now),/anulado/);
});

test('existing sale receipt can mark one promissory installment paid without changing cash',async()=>{
 const at=Date.UTC(2026,10,10,12),loadId='old-receipt-load';
 const s=financeDbV804([['empresas/tenant/dados/sm2_carregamentos/registros/a',
  {grupoCargaId:loadId,cargaStatus:'concluido',cargaBaixadaEm:at,atualizadoEm:at,valor:360,quantidade:10,volume:2,tipoMedida:'m3',madeiraId:'wood'}]]);
 const init=request(await row(s),{payment:{mode:'cash',paidDate:'2026-11-20'}});
 await saveSaleReceipt(s.db,s.identity,init,now);
 const before=await cash(s);
 const details={empresaId:'tenant',loadId,numero:1,amountCents:36000,paymentId:init.operationId};
 const options=await readPromissoriaPaymentOptions(s.db,'tenant',loadId,1,36000);
 assert.equal(options.payment,null);
 assert.deepEqual(options.matchingPayments,[{id:init.operationId,date:'2026-11-20',amountCents:36000}]);
 assert.deepEqual((await readPromissoriaPaymentOptions(s.db,'tenant',loadId,1,18000)).matchingPayments,[]);
 await assert.rejects(()=>linkExistingPromissoriaPayment(s.db,s.identity,{...details,amountCents:18000},now),/mesmo valor/);
 const concurrent=await Promise.allSettled([1,2].map(numero=>linkExistingPromissoriaPayment(s.db,s.identity,{...details,numero},now)));
 assert.equal(concurrent.filter(result=>result.status==='fulfilled').length,1);
 const winner=concurrent[0].status==='fulfilled'?1:2;
 const expected={date:'2026-11-20',amountCents:36000,voided:false};
 assert.deepEqual(await readPromissoriaPayment(s.db,'tenant',loadId,winner),expected);
 const writes=s.writes.length;
 assert.deepEqual(await linkExistingPromissoriaPayment(s.db,s.identity,{...details,numero:winner},now),expected);
 assert.deepEqual(await confirmPromissoriaPayment(s.db,s.identity,{...details,numero:winner,date:'2026-11-20'},now),expected);
 assert.equal(s.writes.length,writes);
 assert.deepEqual(await cash(s),before);
 await saveSaleReceipt(s.db,s.identity,request(await row(s),{action:'void',paymentId:init.operationId}),now);
 assert.equal((await readPromissoriaPayment(s.db,'tenant',loadId,winner)).voided,true);
});
