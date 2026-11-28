import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {normalizeSaleReceiptV807,saleReceivedCentsV807,saleAccountsV807} from '../public/sale-receipts.mjs';import {purchasePaymentCentsV758} from '../public/purchase-payments.mjs';
const source=readFileSync(new URL('../ui/sale-receipts.js',import.meta.url),'utf8'),id=randomUUID(),sale={id,revision:0,type:'sale',status:'active',date:'2026-11-10',amountCents:5200000,description:'Venda',partner:'Cliente',receiptSignature:'1'.repeat(64),paymentUnknown:true};
function setup(storage=new Map()){
 const nodes={},calls=[];let send=async()=>{throw Error('Resposta perdida');},refresh=0;
 const node=id=>nodes[id]||(nodes[id]={id,value:'',dataset:{},innerHTML:'',textContent:'',querySelectorAll:()=>[],addEventListener(){}});
 const c={Date,crypto:{randomUUID},normalizeSaleReceiptV807,saleReceivedCentsV807,purchasePaymentCentsV758,finElV722:node,document:{getElementById:node},finOwnerV722:()=>true,empresaV456:'tenant',window:{__v456Local:{durable:true,getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},navigator:{onLine:true},confirm:()=>true,setTimeout(){},esc:String,stockChartLabelV720:String,finMoneyV722:n=>'R$'+(n/100).toFixed(2),financeLoadedRangeV722:{},cashLoadV759:async()=>{refresh++;},financeRequestV722:async(payload,range,endpoint)=>{calls.push({payload,range,endpoint});return send(payload,range);}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/purchase-payments.js',import.meta.url),'utf8').slice(readFileSync(new URL('../ui/purchase-payments.js',import.meta.url),'utf8').indexOf('function paymentEntryTodayV810'))+'\n'+source,c);c.saleFixture=sale;vm.runInContext("saleReceiptAccountsStateV807={empresaId:'tenant',canWrite:true,report:{rows:[saleFixture]}}",c);
 return {c,nodes,node,storage,calls,get refresh(){return refresh;},setSend:fn=>send=fn};
}
test('receipt condition does not presume received sales; credit keeps amount out of cash',()=>{
 const s=setup();assert.equal(s.c.saleReceiptPaymentInputV807({paymentMode:'credit',paymentDue:'2026-11-30'},5200000,'2026-11-10',true).paidCents,0);assert.throws(()=>s.c.saleReceiptPaymentInputV807({},5200000,'2026-11-10',true));
 s.c.fixture={...sale,paymentUnknown:true};s.c.report=saleAccountsV807([sale],{from:'2026-11-01',to:'2026-11-20'});vm.runInContext("saleReceiptAccountsStateV807.report=report",s.c);s.c.saleReceiptAccountsRenderV807();assert.match(s.node('saleReceiptRowsV807').innerHTML,/Recebimento não informado/);assert.match(s.node('saleReceiptRowsV807').innerHTML,/data-sale-receipt-initialize/);assert.match(s.node('saleReceiptNoteV807').textContent,/Não foram consideradas recebidas/);
});
test('uncertain receipt preserves operation and company-scoped payload, retry reloads accounts and updates cash',async()=>{
 const s=setup(),payload={companyId:'tenant',entryId:id,revision:0,operationId:randomUUID(),action:'initialize',saleDate:sale.date,loadId:null,signature:sale.receiptSignature,acknowledged:true,payment:{mode:'cash',paidDate:'2026-11-20',paidCents:5200000}};
 await s.c.saleReceiptPaymentSendV807(payload);assert.equal(s.calls[0].endpoint,'company-sale-receipts');assert.deepEqual(JSON.parse(s.storage.get('sale_receipt_pending_v807:tenant')),payload);assert.match(s.node('saleReceiptStatusV807').textContent,/tentativa pendente/);
 const next=setup(s.storage);vm.runInContext('saleReceiptPaymentPendingV807='+JSON.stringify(payload),next.c);let reloaded=0;next.c.saleReceiptAccountsLoadV807=async()=>{reloaded++;};next.setSend(async input=>{assert.deepEqual(JSON.parse(JSON.stringify(input)),payload);return {empresaId:'tenant'};});await next.c.saleReceiptPaymentSendV807(payload);assert.equal(next.refresh,1);assert.equal(reloaded,1);assert.equal(JSON.parse(next.storage.get('sale_receipt_pending_v807:tenant')),null);
});
test('offline or insufficient local storage does not submit, and late reply cannot clear another company storage',async()=>{
 const s=setup(),payload={companyId:'tenant',entryId:id,operationId:randomUUID()};s.c.navigator.onLine=false;await s.c.saleReceiptPaymentSendV807(payload);assert.equal(s.calls.length,0);s.c.navigator.onLine=true;s.c.window.__v456Local.setItem=()=>{throw Error('Sem espaço');};await s.c.saleReceiptPaymentSendV807(payload);assert.equal(s.calls.length,0);
 const late=setup();let done;late.setSend(()=>new Promise(r=>done=r));const task=late.c.saleReceiptPaymentSendV807(payload);await Promise.resolve();late.c.empresaV456='other';done({empresaId:'tenant'});await task;assert(late.storage.has('sale_receipt_pending_v807:tenant'));assert.equal(late.storage.has('sale_receipt_pending_v807:other'),false);assert.equal(late.refresh,0);
});
test('receipt submission identifies the original sale and requires confirmation against duplicate manual cash entries',async()=>{
 const s=setup();s.node('entryReceipt'+id+'ModeV757').value='cash';s.node('entryReceipt'+id+'DateV757').value='2026-11-20';
 const root={dataset:{saleReceiptEntry:id}},button={closest:()=>root,hasAttribute:key=>key==='data-sale-receipt-initialize'};s.c.confirm=()=>false;await s.c.saleReceiptPaymentActionV807(button);assert.equal(s.calls.length,0);s.c.confirm=()=>true;await s.c.saleReceiptPaymentActionV807(button);const p=s.calls[0].payload;assert.equal(p.entryId,id);assert.equal(p.signature,sale.receiptSignature);assert.equal(p.acknowledged,true);assert.equal(p.payment.paidCents,5200000);
});

test('old unconfirmed sales default receipt date to today and never fall back to sale date when cleared',()=>{
 const s=setup();s.c.Date=class extends Date{constructor(...args){super(...(args.length?args:['2026-11-20T12:00:00Z']));}};s.c.report=saleAccountsV807([sale],{from:'2026-11-01',to:'2026-11-20'});vm.runInContext('saleReceiptAccountsStateV807.report=report',s.c);s.c.saleReceiptAccountsRenderV807();assert.equal(s.node('entryReceipt'+id+'DateV757').value,'2026-11-20');assert.throws(()=>s.c.saleReceiptPaymentInputV807({paymentMode:'cash',paymentDate:''},5200000,'2026-11-10',true),/data/);
});
