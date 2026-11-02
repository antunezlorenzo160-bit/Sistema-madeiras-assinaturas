import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONTRACT_TERMS} from '../config/contract-terms.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveConfiguration,createLiveCheckout,confirmLivePayment,liveOverview,inspectLiveConnection} from '../Netlify/Funtions/lib/live-payments.mjs';
import {billingAccessState} from '../public/billing-access.mjs';
const root='plataforma_admin/billing',now=Date.parse('2026-10-31T19:00:00Z');
function setup(){
 const config=liveConfiguration({MERCADO_PAGO_LIVE_ENABLED:'true',MERCADO_PAGO_LIVE_ACCESS_TOKEN:'APP_USR-fake-not-a-real-token',MERCADO_PAGO_LIVE_COLLECTOR_ID:'123',MERCADO_PAGO_LIVE_WEBHOOK_SECRET:'fake',MERCADO_PAGO_LIVE_ORIGIN:'https://system.example',MERCADO_PAGO_LIVE_COMPANY_IDS:'tenant',PAYMENT_TERMS_URL:'https://system.example'+CONTRACT_TERMS.path},{...CONTRACT_TERMS,status:'published'}),identity={uid:'owner',emailVerified:true};
 const records=new Map([['membros/owner',{empresaId:'tenant',ativo:true,papel:'admin'}],[`${root}/companies/tenant`,{name:'Empresa',ownerUid:'owner'}],[`${root}/plans/monthly`,{name:'SM',amountCents:19000,interval:'monthly',updatedAt:1,active:true}]]),writes=[],calls=[];let payment=null,chain=Promise.resolve();
 const snapshot=ref=>({id:ref.path.split('/').at(-1),exists:records.has(ref.path),data:()=>structuredClone(records.get(ref.path))});
 const db={doc:path=>({path,get:async()=>snapshot({path})}),collection:path=>({limit:()=>({get:async()=>{const docs=[...records.keys()].filter(key=>key.startsWith(path+'/')).map(path=>snapshot({path}));return {docs,size:docs.length};}})}),runTransaction(fn){const task=chain.then(async()=>{const pending=[];let writing=false;const result=await fn({get:async ref=>{assert(!writing,'all reads precede writes');return snapshot(ref);},set(ref,data,options){writing=true;pending.push([ref.path,options?.merge?{...records.get(ref.path),...structuredClone(data)}:structuredClone(data)]);},update(ref,data){writing=true;assert(records.has(ref.path));pending.push([ref.path,{...records.get(ref.path),...structuredClone(data)}]);},create(ref,data){writing=true;assert(!records.has(ref.path));pending.push([ref.path,structuredClone(data)]);}});for(const [key,data]of pending){records.set(key,data);writes.push(key);}return result;});chain=task.catch(()=>{});return task;}};
 const request=async(url,options)=>{calls.push({url,options});if(url.endsWith('/users/me'))return {ok:true,json:async()=>({id:123,tags:[]})};if(url.endsWith('/checkout/preferences')){const body=JSON.parse(options.body);return {ok:true,json:async()=>({id:'pref',init_point:'https://www.mercadopago.com.br/checkout/start?pref_id=pref',collector_id:123,external_reference:body.external_reference})};}return {ok:true,json:async()=>url.includes('/search?')?{results:payment?[payment]:[]}:payment};};
 const input={planId:'monthly',expectedAmountCents:19000,expectedInterval:'monthly',revision:1,acceptRealPayment:true,termsVersion:CONTRACT_TERMS.version,termsContentId:CONTRACT_TERMS.contentId,renewalPreference:'manual'};
 const args={db,identity,input,config,origin:config.origin,request,now};
 return {args,records,writes,calls,pay(chargeId,id='456',status='approved'){payment={id,external_reference:chargeId,collector_id:123,live_mode:true,currency_id:'BRL',transaction_amount:190,date_approved:new Date(now).toISOString(),status};return payment;}};
}
test('live payments are disabled by default; no test credential, unapproved company or alternate origin can create a checkout',async()=>{
 assert.equal(liveConfiguration({}).ready,false);
 for(const variation of ['disabled','test','company','origin','accept','automatic','price']){const s=setup();if(variation==='disabled')s.args.config.ready=false;if(variation==='test')s.args.config=liveConfiguration({MERCADO_PAGO_LIVE_ACCESS_TOKEN:'TEST-token'});if(variation==='company')s.args.config.companies=['other'];if(variation==='origin')s.args.origin='https://other.example';if(variation==='accept')s.args.input.acceptRealPayment=false;if(variation==='automatic')s.args.input.renewalPreference='automatic';if(variation==='price')s.args.input.expectedAmountCents=1;await assert.rejects(createLiveCheckout(s.args));assert(!s.calls.some(call=>call.url.endsWith('/checkout/preferences')));assert.equal(s.writes.length,0);}
});
test('real checkout is idempotent, uses server quote and exposes no token; approval alone grants a live period',async()=>{
 const s=setup(),first=await createLiveCheckout(s.args),second=await createLiveCheckout(s.args);assert.equal(first.id,second.id);assert.equal(s.calls.filter(call=>call.url.endsWith('/checkout/preferences')).length,1);assert.equal(s.records.has('empresas/tenant/acesso/plano'),false);
 const preference=JSON.parse(s.calls.find(call=>call.url.endsWith('/checkout/preferences')).options.body);assert.equal(preference.items[0].unit_price,190);assert(preference.notification_url.endsWith('/mercadopago-live-webhook'));assert.equal(s.records.get(`${root}/live_charges/${first.id}`).acceptance.uid,'owner');
 const overview=await liveOverview(s.args.db,s.args.identity,s.args.config);assert(!JSON.stringify(overview).includes(s.args.config.token));assert.equal(overview.checkout.mode,'live');
 s.pay(first.id);let result=await confirmLivePayment({...s.args,chargeId:first.id});assert.equal(result.periodApplied,true);const period=s.records.get(`${root}/live_contract_periods/tenant`);assert.equal(period.mode,'live');assert.equal(period.amountCents,19000);assert.equal(billingAccessState(s.records.get('empresas/tenant/acesso/plano'),now).phase,'active');
 result=await confirmLivePayment({...s.args,chargeId:first.id});assert(result.alreadyConfirmed);assert.equal(s.records.get(`${root}/live_contract_periods/tenant`).id,period.id);await assert.rejects(createLiveCheckout(s.args),/vigente/);
});
test('test mode, wrong receiver, currency, value and reference cannot activate a real plan',async()=>{
 for(const variation of ['test','seller','currency','amount','reference']){const s=setup(),charge=await createLiveCheckout(s.args),payment=s.pay(charge.id);if(variation==='test')payment.live_mode=false;if(variation==='seller')payment.collector_id=999;if(variation==='currency')payment.currency_id='USD';if(variation==='amount')payment.transaction_amount=1;if(variation==='reference')payment.external_reference='foreign';await assert.rejects(confirmLivePayment({...s.args,chargeId:charge.id,paymentId:'456'}));assert.equal(s.records.has('empresas/tenant/acesso/plano'),false);}
});
test('pending payment, browser return and quote creation never grant access',async()=>{const s=setup(),charge=await createLiveCheckout(s.args);s.pay(charge.id,'456','pending');const result=await confirmLivePayment({...s.args,chargeId:charge.id});assert.equal(result.status,'pending');assert.equal(s.records.has('empresas/tenant/acesso/plano'),false);});
test('full and partial refunds revoke only their own active live period, duplicates do not extend it',async()=>{
 for(const kind of ['refunded','charged_back','partial']){const s=setup(),charge=await createLiveCheckout(s.args);s.pay(charge.id);await confirmLivePayment({...s.args,chargeId:charge.id});const payment=s.pay(charge.id,'456',kind==='partial'?'approved':kind);if(kind==='partial')payment.transaction_amount_refunded=10;await confirmLivePayment({...s.args,chargeId:charge.id});assert(s.records.get(`${root}/live_contract_periods/tenant`).revokedAt);assert.equal(billingAccessState(s.records.get('empresas/tenant/acesso/plano'),now).phase,'settings');}
 const s=setup(),charge=await createLiveCheckout(s.args);s.pay(charge.id);await confirmLivePayment({...s.args,chargeId:charge.id});const original=s.records.get(`${root}/live_contract_periods/tenant`);s.pay(charge.id,'789');const result=await confirmLivePayment({...s.args,chargeId:charge.id});assert.equal(result.status,'duplicate_payment_review');assert.equal(s.records.get(`${root}/live_contract_periods/tenant`).id,original.id);
});
test('old refunded payment cannot revoke a later period',async()=>{const s=setup(),charge=await createLiveCheckout(s.args);s.pay(charge.id);await confirmLivePayment({...s.args,chargeId:charge.id});s.records.set(`${root}/live_contract_periods/tenant`,{id:'new-period',paymentId:'789',mode:'live'});const access=structuredClone(s.records.get('empresas/tenant/acesso/plano'));s.pay(charge.id,'456','refunded');await confirmLivePayment({...s.args,chargeId:charge.id});assert.deepEqual(s.records.get('empresas/tenant/acesso/plano'),access);assert.equal(s.records.get(`${root}/live_contract_periods/tenant`).id,'new-period');});
test('unverified or inactive member, non-owner and suspended company cannot create live payment',async()=>{for(const change of ['email','inactive','nonowner','suspended']){const s=setup();if(change==='email')s.args.identity.emailVerified=false;if(change==='inactive')s.records.get('membros/owner').ativo=false;if(change==='nonowner')s.records.get(`${root}/companies/tenant`).ownerUid='other';if(change==='suspended')s.records.get(`${root}/companies/tenant`).accessStatus='suspended';await assert.rejects(createLiveCheckout(s.args));assert.equal(s.calls.length,0);}});
test('uncertain provider response is blocked for manual review instead of creating duplicate preferences',async()=>{const s=setup(),request=s.args.request;s.args.request=async(url,opts)=>{if(url.endsWith('/checkout/preferences'))throw Error('connection lost');return request(url,opts);};await assert.rejects(createLiveCheckout(s.args));assert([...s.records.values()].some(data=>data.status==='checkout_review'));s.args.request=request;await assert.rejects(createLiveCheckout(s.args),/tentativa/);assert.equal(s.calls.filter(call=>call.url.endsWith('/checkout/preferences')).length,0);});
test('expired live plan renews with a new payment while preserving the first period audit and charge',async()=>{
 const s=setup(),first=await createLiveCheckout(s.args);s.pay(first.id);await confirmLivePayment({...s.args,chargeId:first.id});const original=structuredClone(s.records.get(`${root}/live_contract_periods/tenant`)),charge=structuredClone(s.records.get(`${root}/live_charges/${first.id}`));
 const renewalAt=original.endsAt+1000,next=await createLiveCheckout({...s.args,now:renewalAt});assert.notEqual(next.id,first.id);const p=s.pay(next.id,'789');p.date_approved=new Date(renewalAt).toISOString();await confirmLivePayment({...s.args,now:renewalAt,chargeId:next.id});const renewed=s.records.get(`${root}/live_contract_periods/tenant`);assert.equal(renewed.paymentId,'789');assert.equal(renewed.startsAt,renewalAt);assert(renewed.endsAt>original.endsAt);assert.deepEqual(s.records.get(`${root}/live_charges/${first.id}`),charge);
});
test('concurrent create clicks reserve one checkout, and disabling new sales does not block existing confirmations',async()=>{
 const s=setup(),results=await Promise.allSettled([createLiveCheckout(s.args),createLiveCheckout(s.args)]),charge=results.find(result=>result.status==='fulfilled').value;assert.equal(s.calls.filter(call=>call.url.endsWith('/checkout/preferences')).length,1);s.pay(charge.id);s.args.config.ready=false;s.args.config.companies=[];assert.equal((await confirmLivePayment({...s.args,chargeId:charge.id})).status,'approved');
});

test('owner preflight discovers receiver without prior ID or enabled sales and returns no credentials',async()=>{
 const config={token:'APP_USR-fake',collectorId:undefined,ready:false,missing:['conta recebedora']},calls=[];
 const result=await inspectLiveConnection(config,async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({id:123,tags:[],email:'private@example.com'})};});
 assert.equal(result.collectorId,'123');assert.equal(result.ready,false);assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.mercadopago.com/users/me');assert.equal(calls[0].options.method,'GET');assert(!JSON.stringify(result).includes(config.token));assert(!JSON.stringify(result).includes('private@example.com'));assert.equal(config.collectorId,undefined);
});
test('receiver preflight refuses sandbox credentials, test accounts and mismatched configured receiver',async()=>{
 let calls=0;await assert.rejects(inspectLiveConnection({token:'TEST-fake'},async()=>calls++));assert.equal(calls,0);
 for(const [config,account] of [[{token:'APP_USR-fake'},{id:123,tags:['test_user']}],[{token:'APP_USR-fake',collectorId:'999'},{id:123,tags:[]}]]){
  await assert.rejects(inspectLiveConnection(config,async()=>({ok:true,json:async()=>account})));
 }
});

test('review terms cannot enable live checkout even with all environment variables filled',async()=>{
 const s=setup(),c=s.args.config;const config=liveConfiguration({MERCADO_PAGO_LIVE_ENABLED:'true',MERCADO_PAGO_LIVE_ACCESS_TOKEN:c.token,MERCADO_PAGO_LIVE_COLLECTOR_ID:c.collectorId,MERCADO_PAGO_LIVE_WEBHOOK_SECRET:c.secret,MERCADO_PAGO_LIVE_ORIGIN:c.origin,MERCADO_PAGO_LIVE_COMPANY_IDS:'tenant',PAYMENT_TERMS_URL:c.termsUrl},{...CONTRACT_TERMS,status:'review'});
 assert.equal(config.ready,false);assert.equal(config.termsReady,false);await assert.rejects(createLiveCheckout({...s.args,config}));assert.equal(s.calls.length,0);
});
test('old terms or altered content identity cannot create a payment and acceptance records the exact server version',async()=>{
 for(const change of [{termsVersion:'manual-v1'},{termsContentId:'different'}]){const s=setup();await assert.rejects(createLiveCheckout({...s.args,input:{...s.args.input,...change}}));assert.equal(s.calls.length,0);}
 const s=setup(),charge=await createLiveCheckout(s.args),acceptance=s.records.get(root+'/live_charges/'+charge.id).acceptance;assert.equal(acceptance.version,CONTRACT_TERMS.version);assert.equal(acceptance.contentId,CONTRACT_TERMS.contentId);assert.equal(acceptance.url,s.args.config.origin+CONTRACT_TERMS.path);
});
test('terms snapshot matches its immutable Git content identity',()=>{
 const html=readFileSync(new URL('../public'+CONTRACT_TERMS.path,import.meta.url));
 assert(html.toString('utf8').includes(CONTRACT_TERMS.version));
 const digest=createHash('sha1').update(Buffer.from('blob '+html.length+'\0')).update(html).digest('hex');assert.equal(CONTRACT_TERMS.contentId,'git-blob:'+digest);
});

test('published terms version uses the preserved document while an unversioned or foreign URL stays blocked',()=>{
 const env={MERCADO_PAGO_LIVE_ENABLED:'true',MERCADO_PAGO_LIVE_ACCESS_TOKEN:'APP_USR-fake',MERCADO_PAGO_LIVE_COLLECTOR_ID:'123',MERCADO_PAGO_LIVE_WEBHOOK_SECRET:'fake',MERCADO_PAGO_LIVE_ORIGIN:'https://system.example',MERCADO_PAGO_LIVE_COMPANY_IDS:'tenant',PAYMENT_TERMS_URL:'https://system.example'+CONTRACT_TERMS.path};
 assert.equal(CONTRACT_TERMS.status,'published');assert.equal(liveConfiguration(env).ready,true);assert.equal(liveConfiguration({...env,MERCADO_PAGO_LIVE_ENABLED:'false'}).ready,false);
 for(const url of ['https://system.example/termos/','https://other.example'+CONTRACT_TERMS.path])assert.equal(liveConfiguration({...env,PAYMENT_TERMS_URL:url}).ready,false);
});
test('owner exemption survives later payment and refund without modifying other tenants',async()=>{
 const {exemptOwnerCompany}=await import('../Netlify/Funtions/lib/owner-exemption.mjs');
 const {simulateBillingAccess}=await import('../Netlify/Funtions/lib/billing-access.mjs');
 const s=setup(),charge=await createLiveCheckout(s.args);s.records.set('empresas/tenant',{ownerUid:'owner'});
 s.records.set('empresas/other/acesso/plano',{enabled:true,mode:'live'});
 const other=structuredClone(s.records.get('empresas/other/acesso/plano'));
 await exemptOwnerCompany(s.args.db,s.args.identity,now);
 const policy=structuredClone(s.records.get('empresas/tenant/acesso/plano'));
 assert.equal(policy.mode,'owner_exempt');assert.equal(billingAccessState(policy,now+1000*86400000).write,true);
 s.pay(charge.id);await confirmLivePayment({...s.args,chargeId:charge.id});
 assert.equal(s.records.get(`${root}/live_charges/${charge.id}`).status,'approved');assert.deepEqual(s.records.get('empresas/tenant/acesso/plano'),policy);
 s.pay(charge.id,'456','refunded');await confirmLivePayment({...s.args,chargeId:charge.id});
 assert.equal(s.records.get(`${root}/live_charges/${charge.id}`).status,'refunded');assert.deepEqual(s.records.get('empresas/tenant/acesso/plano'),policy);
 assert.deepEqual(s.records.get('empresas/other/acesso/plano'),other);
 assert.equal((await exemptOwnerCompany(s.args.db,s.args.identity,now+1)).alreadyExempt,true);
 await assert.rejects(simulateBillingAccess(s.args.db,{empresaId:'tenant',phase:'off',expectedUpdatedAt:now},'owner',now),{status:409});
});
test('owner exemption rejects unverified, inactive, suspended and differently owned companies with no writes',async()=>{
 const {exemptOwnerCompany}=await import('../Netlify/Funtions/lib/owner-exemption.mjs');
 for(const variation of ['email','inactive','companyOwner','billingOwner','suspended']){
  const s=setup();s.records.set('empresas/tenant',{ownerUid:'owner'});
  if(variation==='email')s.args.identity.emailVerified=false;
  if(variation==='inactive')s.records.get('membros/owner').ativo=false;
  if(variation==='companyOwner')s.records.get('empresas/tenant').ownerUid='someone';
  if(variation==='billingOwner')s.records.get(`${root}/companies/tenant`).ownerUid='someone';
  if(variation==='suspended')s.records.get(`${root}/companies/tenant`).accessStatus='suspended';
  await assert.rejects(exemptOwnerCompany(s.args.db,s.args.identity,now));assert.equal(s.writes.length,0);
 }
});
test('archived plans disappear from offers and cannot create new real checkouts',async()=>{
 const s=setup();s.records.get(`${root}/plans/monthly`).active=false;
 const overview=await liveOverview(s.args.db,s.args.identity,s.args.config);assert.equal(overview.offers.length,0);
 await assert.rejects(createLiveCheckout(s.args));assert(!s.calls.some(c=>c.url.endsWith('/checkout/preferences')));
});

test('registered-company policy makes future registered owners eligible without editing the allowlist',async()=>{
 const s=setup();s.args.config={...s.args.config,companyPolicy:'registered',companies:[]};
 assert.equal((await liveOverview(s.args.db,s.args.identity,s.args.config)).ready,true);
 const first=await createLiveCheckout(s.args);
 s.records.set('membros/new-owner',{empresaId:'new-tenant',ativo:true,papel:'admin'});
 s.records.set(root+'/companies/new-tenant',{name:'New customer',ownerUid:'new-owner'});
 const second=await createLiveCheckout({...s.args,identity:{uid:'new-owner',emailVerified:true}});
 assert.notEqual(first.id,second.id);
 assert.equal(s.records.get(root+'/live_charges/'+second.id).empresaId,'new-tenant');
});
test('registered policy still rejects unregistered, suspended, unverified and non-owner accounts',async()=>{
 for(const variation of ['missing-member','missing-company','inactive','suspended','email','employee']){
  const s=setup();s.args.config={...s.args.config,companyPolicy:'registered',companies:[]};
  if(variation==='missing-member')s.records.delete('membros/owner');
  if(variation==='missing-company')s.records.delete(root+'/companies/tenant');
  if(variation==='inactive')s.records.get('membros/owner').ativo=false;
  if(variation==='suspended')s.records.get(root+'/companies/tenant').accessStatus='suspended';
  if(variation==='email')s.args.identity.emailVerified=false;
  if(variation==='employee')s.records.get(root+'/companies/tenant').ownerUid='different-owner';
  await assert.rejects(createLiveCheckout(s.args));assert.equal(s.writes.length,0);assert.equal(s.calls.length,0);
 }
});
test('registered checkout ignores a forged company ID and binds the charge to the authenticated membership',async()=>{
 const s=setup();s.args.config={...s.args.config,companyPolicy:'registered',companies:[]};s.args.input.empresaId='another-customer';
 const result=await createLiveCheckout(s.args);
 assert.equal(s.records.get(root+'/live_charges/'+result.id).empresaId,'tenant');
 assert(!s.writes.some(path=>path.includes('another-customer')));
});
test('registered policy is explicit and invalid policy fails closed',()=>{
 const env={MERCADO_PAGO_LIVE_ENABLED:'true',MERCADO_PAGO_LIVE_ACCESS_TOKEN:'APP_USR-fake',MERCADO_PAGO_LIVE_COLLECTOR_ID:'123',MERCADO_PAGO_LIVE_WEBHOOK_SECRET:'fake',MERCADO_PAGO_LIVE_ORIGIN:'https://system.example',PAYMENT_TERMS_URL:'https://system.example'+CONTRACT_TERMS.path};
 assert.equal(liveConfiguration(env).ready,false);
 assert.equal(liveConfiguration({...env,MERCADO_PAGO_LIVE_COMPANY_POLICY:'registered'}).ready,true);
 assert.equal(liveConfiguration({...env,MERCADO_PAGO_LIVE_COMPANY_POLICY:'anything',MERCADO_PAGO_LIVE_COMPANY_IDS:'tenant'}).ready,false);
 assert.equal(liveConfiguration({...env,MERCADO_PAGO_LIVE_COMPANY_POLICY:'registered',MERCADO_PAGO_LIVE_ENABLED:'false'}).ready,false);
});
