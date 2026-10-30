import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCompanyTestCheckout,verifyCompanyTestCheckout} from '../Netlify/Funtions/lib/company-checkout.mjs';
import {confirmTestPayment} from '../Netlify/Funtions/lib/payment-confirmation.mjs';
import {requestCompanyContract,companyContractOverview} from '../Netlify/Funtions/lib/company-contract.mjs';
const root='plataforma_admin/billing';
function setup(){
 const now=Date.parse('2026-10-30T15:00:00Z'),terms={empresaId:'company',planId:'monthly',planName:'SM',amountCents:19990,interval:'monthly',renewalPreference:'manual',automaticBilling:false,simulationOnly:true,status:'requested_test',requestedBy:'owner',requestedAt:now-1000};
 const records=new Map([['membros/owner',{empresaId:'company',ativo:true,papel:'admin'}],[`${root}/companies/company`,{name:'Empresa',ownerUid:'owner'}],[`${root}/plans/monthly`,{name:'SM',amountCents:19990,interval:'monthly',active:true,updatedAt:1}],[`${root}/contract_requests/company`,terms],[`${root}/subscriptions/company`,{status:'trial',trialMode:'indefinite',planId:'monthly'}]]);
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>records.get(path)});
 const db={doc:path=>({path,id:path.split('/').at(-1),get:async()=>snap(path)}),collection:path=>({limit:()=>({get:async()=>{const docs=[...records.keys()].filter(k=>k.startsWith(path+'/')).map(snap);return {docs,size:docs.length}}})}),runTransaction:async fn=>{let writing=false;return fn({get:async ref=>{assert.equal(writing,false);return snap(ref.path)},set(ref,data,opts){writing=true;records.set(ref.path,opts?.merge?{...records.get(ref.path),...data}:data)},update(ref,data){writing=true;records.set(ref.path,{...records.get(ref.path),...data})},create(ref,data){writing=true;assert(!records.has(ref.path));records.set(ref.path,data)}})}};
 let calls=0,last;
 const args={db,identity:{uid:'owner',emailVerified:true},input:{expectedRequestedAt:terms.requestedAt,simulationOnly:true},base:'https://preview.example',token:'TEST-only',webhookSecret:'test-secret',now,checkout:async options=>{calls++;last=options;return {url:'https://sandbox.mercadopago.com/checkout',preferenceId:'preference',sellerId:'123',mode:'test'}}};
 return {records,args,terms,get calls(){return calls},get last(){return last}};
}
test('company creates one checkout with server amount, derived tenant and required notification callback',async()=>{
 const s=setup();s.args.input.empresaId='another';s.args.input.amountCents=1;const r=await createCompanyTestCheckout(s.args);assert.equal(s.calls,1);assert.equal(s.last.amountCents,19990);assert.equal(s.last.reference,r.id);assert.equal(s.last.notificationUrl,'https://preview.example/.netlify/functions/mercadopago-webhook');assert.match(s.last.returnUrl,/contratacao/);assert.equal(s.records.get(`${root}/charges/${r.id}`).empresaId,'company');assert.equal((await createCompanyTestCheckout(s.args)).id,r.id);assert.equal(s.calls,1);assert.equal(s.records.get('membros/owner').ativo,true);assert.equal(s.records.get(`${root}/subscriptions/company`).status,'trial');
 const view=await companyContractOverview(s.args.db,s.args.identity,s.args.now);assert.equal(view.checkout.id,r.id);assert.equal(view.checkout.mode,'test');assert.equal(view.checkout.sellerId,undefined);
});
test('unverified, foreign responsible, inactive membership and suspended company fail before provider calls',async()=>{
 for(const change of ['email','owner','member','suspended']){const s=setup();if(change==='email')s.args.identity.emailVerified=false;if(change==='owner')s.records.get(`${root}/companies/company`).ownerUid='another';if(change==='member')s.records.get('membros/owner').ativo=false;if(change==='suspended')s.records.get(`${root}/companies/company`).accessStatus='suspended';await assert.rejects(createCompanyTestCheckout(s.args));assert.equal(s.calls,0)}
});
test('stale quote, automatic renewal, absent webhook and active period cannot create a payment',async()=>{
 for(const change of ['request','amount','automatic','secret','period']){const s=setup();if(change==='request')s.args.input.expectedRequestedAt--;if(change==='amount')s.records.get(`${root}/plans/monthly`).amountCents=20000;if(change==='automatic')s.terms.renewalPreference='automatic';if(change==='secret')s.args.webhookSecret='';if(change==='period')s.records.set(`${root}/test_contract_periods/company`,{id:'existing',mode:'test',endsAt:s.args.now+10000});await assert.rejects(createCompanyTestCheckout(s.args));assert.equal(s.calls,0)}
});
test('free plan starts a period once without credentials or Mercado Pago',async()=>{
 const s=setup();s.terms.amountCents=0;s.records.get(`${root}/plans/monthly`).amountCents=0;s.args.token='';s.args.webhookSecret='';const r=await createCompanyTestCheckout(s.args);assert.equal(r.status,'test_free_period');const period=s.records.get(`${root}/test_contract_periods/company`);assert.equal(period.mode,'test');assert.equal(period.amountCents,0);assert(period.endsAt>s.args.now);assert.equal((await createCompanyTestCheckout(s.args)).id,r.id);assert.equal(s.records.get(`${root}/test_contract_periods/company`).id,period.id);assert.equal(s.calls,0);
});
test('concurrent clicks are rejected during reservation, then reuse the same successful checkout',async()=>{
 const s=setup();let release,entered;const ready=new Promise(resolve=>entered=resolve);s.args.checkout=async()=>{entered();await new Promise(resolve=>release=resolve);return {url:'https://sandbox.mercadopago.com/checkout',preferenceId:'p',sellerId:'123',mode:'test'}};
 const first=createCompanyTestCheckout(s.args);await ready;await assert.rejects(createCompanyTestCheckout(s.args),/preparado/);release();const r=await first;assert.equal((await createCompanyTestCheckout(s.args)).id,r.id);
});
test('provider failure can be retried with the same reference and no second active period',async()=>{
 const s=setup();s.args.checkout=async()=>{throw Error('provider down')};await assert.rejects(createCompanyTestCheckout(s.args),/provider down/);const id=s.records.get(`${root}/contract_requests/company`).checkoutId;assert.equal(s.records.get(`${root}/charges/${id}`).status,'checkout_failed');s.args.checkout=async o=>({url:'https://sandbox.mercadopago.com/checkout',sellerId:'123',preferenceId:o.reference,mode:'test'});assert.equal((await createCompanyTestCheckout(s.args)).id,id);
});
test('provider-approved payment starts the quoted test period and repeats never extend it',async()=>{
 const s=setup(),r=await createCompanyTestCheckout(s.args);const payment={id:456,external_reference:r.id,collector_id:123,currency_id:'BRL',transaction_amount:199.90,status:'approved',live_mode:false,date_approved:new Date(s.args.now).toISOString()};
 const request=async url=>({ok:true,json:async()=>url.endsWith('/users/me')?{id:123,tags:['test_user']}:url.includes('/search?')?{results:[payment]}:payment});
 const confirm=opts=>confirmTestPayment({...opts,request,now:s.args.now});const input={chargeId:r.id};await verifyCompanyTestCheckout({db:s.args.db,identity:s.args.identity,input,token:s.args.token,confirm});const p=s.records.get(`${root}/test_contract_periods/company`);assert.equal(p.amountCents,19990);assert.equal(p.source,'payment_test');await verifyCompanyTestCheckout({db:s.args.db,identity:s.args.identity,input,token:s.args.token,confirm});assert.equal(s.records.get(`${root}/test_contract_periods/company`).id,p.id);assert.equal(s.records.get(`${root}/subscriptions/company`).status,'trial');
});
test('foreign payments never reach provider verification',async()=>{
 const s=setup();s.records.set(`${root}/charges/foreign`,{empresaId:'other',source:'company_test',mode:'test',status:'test_checkout_created'});let calls=0;await assert.rejects(verifyCompanyTestCheckout({db:s.args.db,identity:s.args.identity,input:{chargeId:'foreign'},confirm:async()=>calls++}));assert.equal(calls,0);
});
test('changing the request is blocked while a checkout is pending, but renewal after expiration is possible',async()=>{
 const s=setup(),r=await createCompanyTestCheckout(s.args);const input={planId:'monthly',expectedAmountCents:19990,expectedInterval:'monthly',revision:1,renewalPreference:'automatic',simulationOnly:true};await assert.rejects(requestCompanyContract(s.args.db,s.args.identity,input,s.args.now+1),/Já existe/);
 s.records.get(`${root}/charges/${r.id}`).status='test_payment_approved';s.records.set(`${root}/test_contract_periods/company`,{id:'old',mode:'test',planId:'monthly',endsAt:s.args.now-1,renewalNoticeAt:s.args.now-500});const renewal=await requestCompanyContract(s.args.db,s.args.identity,{...input,renewalPreference:'manual'},s.args.now+1);assert.equal(renewal.request.checkoutId,undefined);assert.equal(renewal.request.requestedAt,s.args.now+1);
});
