import {randomUUID} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {normalizePurchasePaymentV757,purchasePaymentCentsV758,purchasePaidCentsV757} from '../public/purchase-payments.mjs';import {financeCents} from '../public/company-finance.mjs';
const source=readFileSync(new URL('../ui/purchase-payments.js',import.meta.url),'utf8'),id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b',op='b28dedf2-646b-4981-b7ae-0de09b5ed6bd';
function setup(storage=new Map()){
 const nodes={};for(const name of ['finPurchaseAccountsV757','finPurchasePaymentRowsV757','finPurchasePaymentsStatusV757','finPurchasePaymentsRetryV757','finPurchasePaymentTotalsV757','finPurchasePaymentNoteV757'])nodes[name]={textContent:'',innerHTML:'',disabled:false,hidden:false,querySelectorAll:()=>[]};
 const form={value:'300,00',disabled:false};nodes.finPurchasePaymentRowsV757.querySelectorAll=()=>[form];const calls=[];let send=async()=>{throw Error('Conexão perdida');};
 const c={crypto:{randomUUID},normalizePurchasePaymentV757,purchasePaymentCentsV758,purchasePaidCentsV757,financeCents,finElV722:id=>nodes[id]||null,finOwnerV722:()=>true,empresaV456:'tenant',window:{__v456Local:{durable:true,getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},document:{getElementById:()=>null},navigator:{onLine:true},setTimeout(){},financeLoadedRangeV722:{from:'old'},financeRequestV722:async payload=>{calls.push(JSON.parse(JSON.stringify(payload)));return send(payload);}};
 vm.createContext(c);vm.runInContext(source+"\npurchaseAccountsStateV757={canWrite:true};",c);c.purchaseAccountsLoadV757=async()=>{};return {c,nodes,calls,storage,form,setSend:fn=>send=fn};
}
const payload={companyId:'tenant',entryId:id,revision:1,operationId:op,action:'pay',date:'2026-11-14',amountCents:30000};
test('uncertain payment keeps operation identity and typed fields; retry uses exactly the same payment',async()=>{
 const s=setup();await s.c.purchasePaymentSendV757(payload);assert.equal(s.form.value,'300,00');assert(s.form.disabled);assert.equal(s.nodes.finPurchasePaymentsRetryV757.hidden,false);const stored=JSON.parse(s.storage.get('purchase_payment_pending_v757:tenant'));assert.deepEqual(stored,payload);
 const resumed=setup(s.storage);vm.runInContext('purchasePaymentPendingV757='+JSON.stringify(stored),resumed.c);resumed.setSend(async sent=>{assert.deepEqual(sent,payload);return {entry:{id}};});await resumed.c.purchasePaymentSendV757(stored);assert.equal(JSON.parse(resumed.storage.get('purchase_payment_pending_v757:tenant')),null);assert.equal(resumed.c.financeLoadedRangeV722,null);
});
test('definite validation rejection unlocks the preserved form; an uncertain attempt blocks another payment',async()=>{
 const s=setup();s.setSend(async()=>{const e=Error('Valor acima do restante');e.status=400;throw e;});await s.c.purchasePaymentSendV757(payload);assert.equal(s.form.value,'300,00');assert.equal(s.form.disabled,false);assert.equal(JSON.parse(s.storage.get('purchase_payment_pending_v757:tenant')),null);
 const lost=setup();await lost.c.purchasePaymentSendV757(payload);await lost.c.purchasePaymentSendV757({...payload,amountCents:10000});assert.equal(lost.calls.length,1);assert.match(lost.nodes.finPurchasePaymentsStatusV757.textContent,/pendente/);
});
test('late payment result cannot clear pending storage in another company',async()=>{
 const s=setup();let done;s.setSend(async()=>new Promise(resolve=>done=resolve));const task=s.c.purchasePaymentSendV757(payload);await Promise.resolve();assert(done);s.c.empresaV456='other';done({entry:{id}});await task;assert(s.storage.has('purchase_payment_pending_v757:tenant'));assert.equal(s.storage.has('purchase_payment_pending_v757:other'),false);
});
test('Brazilian currency grouping is accepted; malformed separators show a local error; remaining balance fills without paying',async()=>{
 assert.equal(purchasePaymentCentsV758('1.575,57'),157557);assert.equal(purchasePaymentCentsV758('1575,57'),157557);assert.equal(purchasePaymentCentsV758('1575.57'),157557);assert.throws(()=>purchasePaymentCentsV758('1.575.57'),/1575,57/);
 const s=setup(),field={value:'1.575.57'},local={textContent:'',scrollIntoView(){}},date={value:'2026-11-14'},root={dataset:{paymentEntry:id},querySelector:selector=>selector==='[data-payment-amount]'?field:date};s.nodes.finPurchasePaymentRowsV757.querySelector=()=>local;
 vm.runInContext('purchaseAccountsStateV757={canWrite:true,report:{rows:[{id:'+JSON.stringify(id)+',amountCents:467557,settlement:{payments:[{id:'+JSON.stringify(op)+',date:"2026-11-14",amountCents:10000},{id:"a2d00244-a75c-44a4-aa30-bd78176a744d",date:"2026-11-14",amountCents:300000}]}}]}}',s.c);
 const button={closest:()=>root,hasAttribute:attr=>attr==='data-payment-pay'};await s.c.purchasePaymentActionV757(button);assert.equal(s.calls.length,0);assert.match(local.textContent,/1575,57/);assert.equal(field.value,'1.575.57');
 s.c.purchasePaymentUseBalanceV758(button);assert.equal(field.value,'1575,57');assert.equal(s.calls.length,0,'prefill never posts a payment');assert.match(local.textContent,/Confira a data/);
 await s.c.purchasePaymentActionV757(button);assert.equal(s.calls[0].amountCents,157557);assert.equal(s.calls[0].date,'2026-11-14');
});
