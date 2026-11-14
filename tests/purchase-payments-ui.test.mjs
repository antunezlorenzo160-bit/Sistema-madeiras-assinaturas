import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {normalizePurchasePaymentV757} from '../public/purchase-payments.mjs';import {financeCents} from '../public/company-finance.mjs';
const source=readFileSync(new URL('../ui/purchase-payments.js',import.meta.url),'utf8'),id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b',op='b28dedf2-646b-4981-b7ae-0de09b5ed6bd';
function setup(storage=new Map()){
 const nodes={};for(const name of ['finPurchaseAccountsV757','finPurchasePaymentRowsV757','finPurchasePaymentsStatusV757','finPurchasePaymentsRetryV757','finPurchasePaymentTotalsV757','finPurchasePaymentNoteV757'])nodes[name]={textContent:'',innerHTML:'',disabled:false,hidden:false,querySelectorAll:()=>[]};
 const form={value:'300,00',disabled:false};nodes.finPurchasePaymentRowsV757.querySelectorAll=()=>[form];const calls=[];let send=async()=>{throw Error('Conexão perdida');};
 const c={normalizePurchasePaymentV757,financeCents,finElV722:id=>nodes[id]||null,finOwnerV722:()=>true,empresaV456:'tenant',window:{__v456Local:{durable:true,getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},document:{getElementById:()=>null},navigator:{onLine:true},setTimeout(){},financeLoadedRangeV722:{from:'old'},financeRequestV722:async payload=>{calls.push(JSON.parse(JSON.stringify(payload)));return send(payload);}};
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
