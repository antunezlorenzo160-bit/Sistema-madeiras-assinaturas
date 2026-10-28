import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {verifyWebhook,confirmTestPayment} from '../Netlify/Funtions/lib/payment-confirmation.mjs';
function setup(changes={}){
 const charge={mode:'test',sellerId:'123',empresaId:'company',planId:'plan',amountCents:19990,status:'test_checkout_created'};
 const sub={empresaId:'company',planId:'plan',status:'trial',trialMode:'indefinite'};
 const payment={id:456,external_reference:'invoice',collector_id:123,currency_id:'BRL',transaction_amount:199.90,status:'approved',live_mode:false,...changes};
 const records=new Map([['plataforma_admin/billing/charges/invoice',charge],['plataforma_admin/billing/subscriptions/company',sub]]),writes=[];
 const db={doc:path=>({path,id:path.split('/').at(-1)}),runTransaction:async callback=>callback({
  get:async ref=>({exists:records.has(ref.path),data:()=>records.get(ref.path)}),
  update:(ref,data)=>{writes.push({ref,data});Object.assign(records.get(ref.path),data);},
  set:(ref,data)=>{writes.push({ref,data});const previous=records.get(ref.path)||{};Object.assign(previous,data);records.set(ref.path,previous);},
  create:(ref,data)=>{assert(!records.has(ref.path));writes.push({ref,data});records.set(ref.path,data);}
 })};
 const request=async url=>({ok:true,json:async()=>url.endsWith('/users/me')?{id:123,tags:['test_user']}:url.includes('/search?')?{results:[payment]}:payment});
 return {db,records,request,token:'APP_USR-test',chargeId:'invoice',payment,charge,sub,writes};
}
test('provider confirmation is idempotent and preserves indefinite trial and access',async()=>{
 const s=setup();assert.equal((await confirmTestPayment(s)).status,'approved');
 assert.equal(s.charge.status,'test_payment_approved');assert.equal(s.sub.testPayment.status,'approved');
 assert.equal(s.sub.status,'trial');assert.equal(s.sub.trialMode,'indefinite');assert(!s.writes.some(w=>w.ref.path.startsWith('membros/')));
 const count=s.writes.length;assert.equal((await confirmTestPayment(s)).alreadyConfirmed,true);assert.equal(s.writes.length,count);
});
test('mismatched seller, amount, currency, reference and payment id cannot confirm a charge',async()=>{
 for(const changes of [{collector_id:999},{transaction_amount:1},{currency_id:'USD'},{external_reference:'another'},{id:999}]){
  const s=setup(changes);s.paymentId='456';await assert.rejects(confirmTestPayment(s));assert.equal(s.writes.length,0);
 }
});
test('pending payments and missing charges do not activate subscriptions',async()=>{
 const s=setup({status:'pending'});assert.equal((await confirmTestPayment(s)).status,'pending');assert.equal(s.writes.length,0);
 const other=setup();other.paymentId='456';other.payment.external_reference='unknown';delete other.chargeId;
 await assert.rejects(confirmTestPayment(other),/não encontrada/);assert.equal(other.writes.length,0);
});
test('production credentials cannot confirm payments',async()=>{
 const s=setup();s.request=async()=>({ok:true,json:async()=>({id:123,tags:[]})});
 await assert.rejects(confirmTestPayment(s),/Somente pagamentos de teste/);assert.equal(s.writes.length,0);
});
test('webhook requires a fresh HMAC signature covering the payment id and request id',()=>{
 const now=1700000000000,ts=String(now),secret='test-only-secret';
 const signature=createHmac('sha256',secret).update(`id:456;request-id:request;ts:${ts};`).digest('hex');
 const make=(id='456',sig=signature)=>new Request('https://preview.example/.netlify/functions/mercadopago-webhook?data.id='+id,{method:'POST',headers:{'x-request-id':'request','x-signature':`ts=${ts},v1=${sig}`}});
 assert.equal(verifyWebhook(make(),secret,now),'456');
 assert.throws(()=>verifyWebhook(make('789'),secret,now));
 assert.throws(()=>verifyWebhook(make(),secret,now+600000));
 assert.throws(()=>verifyWebhook(make(),undefined,now));
 assert.throws(()=>verifyWebhook(make('456','invalid'),secret,now));
});

test('webhook diagnostics distinguish missing headers, expired timestamp and mismatched key',()=>{
 const now=1700000000000,ts=String(now);
 const signed=createHmac('sha256','correct').update(`id:456;request-id:request;ts:${ts};`).digest('hex');
 const make=(headers={},query='?data.id=456')=>new Request('https://example.com/hook'+query,{headers});
 const headers={'x-request-id':'request','x-signature':`ts=${ts},v1=${signed}`};
 assert.throws(()=>verifyWebhook(make(),'correct',now),e=>e.supportCode==='WEBHOOK_SIGNATURE_MISSING');
 assert.throws(()=>verifyWebhook(make(headers),'different',now),e=>e.supportCode==='WEBHOOK_SIGNATURE_MISMATCH');
 assert.throws(()=>verifyWebhook(make(headers),'correct',now+600000),e=>e.supportCode==='WEBHOOK_TIMESTAMP_EXPIRED');
 assert.throws(()=>verifyWebhook(make(headers,''),'correct',now),e=>e.supportCode==='WEBHOOK_ID_MISSING');
 assert.throws(()=>verifyWebhook(make({'x-signature':headers['x-signature']}),'correct',now),e=>e.supportCode==='WEBHOOK_REQUEST_ID_MISSING');
});

test('a newly confirmed test payment locks the checkout terms rather than the edited catalog price',async()=>{
 const s=setup();Object.assign(s.charge,{contractPeriodVersion:1,previousPeriodId:null,planName:'Anual',interval:'yearly'});s.payment.date_approved='2026-10-28T13:00:00Z';s.now=Date.parse('2026-10-28T13:01:00Z');
 await confirmTestPayment(s);const period=s.records.get('plataforma_admin/billing/test_contract_periods/company');
 assert.equal(period.amountCents,19990);assert.equal(period.interval,'yearly');assert.equal(period.endsAt,Date.parse('2027-10-28T13:00:00Z'));assert.equal(s.charge.periodApplied,true);assert.equal(s.sub.status,'trial');
 const count=s.writes.length;await confirmTestPayment(s);assert.equal(s.writes.length,count);
});
