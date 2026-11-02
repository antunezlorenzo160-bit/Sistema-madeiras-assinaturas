import {CONTRACT_TERMS} from '../../../config/contract-terms.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {PlatformError} from './platform.mjs';
import {companyContext} from './company-contract.mjs';
import {periodEnd,NOTICE_DAYS} from './contract-periods.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../../../public/billing-access.mjs';
const root='plataforma_admin/billing';
const valid=v=>typeof v==='string'&&/^[-\w]{1,120}$/.test(v);
export function liveConfiguration(env=process.env,termsDocument=CONTRACT_TERMS){
 const missing=[];
 if(env.MERCADO_PAGO_LIVE_ENABLED!=='true')missing.push('ativação');
 if(!env.MERCADO_PAGO_LIVE_ACCESS_TOKEN||env.MERCADO_PAGO_LIVE_ACCESS_TOKEN.startsWith('TEST-'))missing.push('credencial de produção');
 if(!/^\d{1,30}$/.test(env.MERCADO_PAGO_LIVE_COLLECTOR_ID||''))missing.push('conta recebedora');
 if(!env.MERCADO_PAGO_LIVE_WEBHOOK_SECRET)missing.push('assinatura do webhook');
 const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u:null;}catch{return null;}};
 const site=https(env.MERCADO_PAGO_LIVE_ORIGIN),terms=https(env.PAYMENT_TERMS_URL);
 if(!site||site.pathname!=='/'||site.search||site.hash)missing.push('endereço do sistema');
 const termsReady=termsDocument.status==='published';
 if(!termsReady)missing.push('conclusão da revisão dos termos');
 if(!terms||!site||terms.origin!==site.origin||terms.pathname!==termsDocument.path||terms.search||terms.hash)missing.push('endereço da versão dos termos');
 const companies=String(env.MERCADO_PAGO_LIVE_COMPANY_IDS||'').split(',').map(x=>x.trim()).filter(valid);
 const companyPolicy=String(env.MERCADO_PAGO_LIVE_COMPANY_POLICY||'allowlist').trim();
 if(!['allowlist','registered'].includes(companyPolicy))missing.push('política de empresas válida');
 if(companyPolicy!=='registered'&&!companies.length)missing.push('empresa autorizada');
 return {ready:!missing.length,missing,origin:site?.origin||'',termsUrl:terms?.href||'',termsReady,termsVersion:termsDocument.version,termsContentId:termsDocument.contentId,companyPolicy,companies,token:env.MERCADO_PAGO_LIVE_ACCESS_TOKEN,collectorId:env.MERCADO_PAGO_LIVE_COLLECTOR_ID,secret:env.MERCADO_PAGO_LIVE_WEBHOOK_SECRET};
}
function companyPaymentsAllowed(config,empresaId){return valid(empresaId)&&(config.companyPolicy==='registered'||config.companies.includes(empresaId));}
function enabled(config,empresaId){if(!config.ready||!companyPaymentsAllowed(config,empresaId))throw new PlatformError(503,'Pagamento real ainda não habilitado para esta empresa.');}
async function provider(config,path,body,request=fetch,method){
 const response=await request('https://api.mercadopago.com'+path,{method:method||(body?'POST':'GET'),headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new PlatformError(502,'O Mercado Pago não confirmou a operação. Consulte o suporte antes de tentar outro pagamento.');return response.json();
}
async function seller(config,request){const s=await provider(config,'/users/me',null,request);if(String(s.id)!==config.collectorId||s.tags?.includes('test_user'))throw new PlatformError(409,'A credencial não corresponde à conta de produção autorizada.');}
const publicCharge=(data,id)=>({id,status:data.status,url:data.url||'',amountCents:data.amountCents,planName:data.planName,interval:data.interval,paymentId:data.paymentId||null,periodApplied:data.periodApplied===true,duplicatePaymentReview:data.duplicatePaymentReview===true,createdAt:data.createdAt,mode:'live',termsVersion:data.acceptance?.version||'',termsUrl:data.acceptance?.url||''});
export async function liveOverview(db,identity,config){
 const company=await companyContext(db,identity),catalog=await db.collection(`${root}/plans`).limit(201).get();
 if(catalog.size>200)throw new PlatformError(409,'O catálogo precisa ser revisado.');
 const [period,lock]=await Promise.all([db.doc(`${root}/live_contract_periods/${company.empresaId}`).get(),db.doc(`${root}/live_checkout_locks/${company.empresaId}`).get()]);
 const linked=lock.exists&&valid(lock.data().chargeId)?await db.doc(`${root}/live_charges/${lock.data().chargeId}`).get():null;
 return {company,ready:config.ready&&companyPaymentsAllowed(config,company.empresaId),missing:config.missing,termsUrl:config.termsUrl,termsVersion:config.termsVersion,termsContentId:config.termsContentId,termsReady:config.termsReady,period:period.exists?period.data():null,checkout:linked?.exists&&linked.data().empresaId===company.empresaId?publicCharge(linked.data(),linked.id):null,offers:catalog.docs.filter(d=>d.data().active!==false&&Number.isSafeInteger(d.data().amountCents)&&d.data().amountCents>0&&d.data().amountCents<=100000000&&['monthly','yearly'].includes(d.data().interval)).map(d=>({id:d.id,name:d.data().name,amountCents:d.data().amountCents,interval:d.data().interval,revision:Number(d.data().updatedAt||0)}))};
}
export async function createLiveCheckout({db,identity,input,config,origin,request=fetch,now=Date.now()}){
 if(!valid(input.planId)||input.acceptRealPayment!==true||input.renewalPreference!=='manual'||input.termsVersion!==config.termsVersion||input.termsContentId!==config.termsContentId)throw new PlatformError(400,'Confira o plano, os termos e a autorização de pagamento real avulso.');
 const company=await companyContext(db,identity);enabled(config,company.empresaId);
 if(config.termsReady!==true)throw new PlatformError(503,'Os termos ainda estão em revisão.');
 if(origin!==config.origin)throw new PlatformError(409,'Abra o endereço autorizado para pagamentos reais.');
 await seller(config,request);
 const reservation=await db.runTransaction(async tx=>{
  const currentCompany=await companyContext(db,identity,ref=>tx.get(ref));if(currentCompany.empresaId!==company.empresaId)throw new PlatformError(409,'O vínculo da conta mudou. Atualize a página.');
  const periodRef=db.doc(`${root}/live_contract_periods/${company.empresaId}`),lockRef=db.doc(`${root}/live_checkout_locks/${company.empresaId}`);
  const [plan,period,lock]=await Promise.all([tx.get(db.doc(`${root}/plans/${input.planId}`)),tx.get(periodRef),tx.get(lockRef)]);
  const p=plan.exists?plan.data():null,old=period.exists?period.data():null;
  if(!p||p.active===false||!Number.isSafeInteger(p.amountCents)||p.amountCents<=0||p.amountCents>100000000||!['monthly','yearly'].includes(p.interval))throw new PlatformError(409,'Plano indisponível.');
  if(input.expectedAmountCents!==p.amountCents||input.expectedInterval!==p.interval||input.revision!==Number(p.updatedAt||0))throw new PlatformError(409,'O plano mudou. Atualize e confira o preço.');
  if(old?.mode==='live'&&!old.revokedAt&&now<old.endsAt)throw new PlatformError(409,'Seu plano real ainda está vigente. Aguarde o vencimento para renovar.');
  const id='live-'+createHash('sha256').update(JSON.stringify([company.empresaId,input.planId,p.amountCents,p.interval,Number(p.updatedAt||0),old?.id||null,config.termsVersion,config.termsContentId])).digest('hex').slice(0,48),ref=db.doc(`${root}/live_charges/${id}`);
  const existing=await tx.get(ref),other=lock.exists&&lock.data().chargeId!==id?await tx.get(db.doc(`${root}/live_charges/${lock.data().chargeId}`)):null;
  if(other?.exists&&['checkout_creating','checkout_ready','checkout_review','pending','in_process'].includes(other.data().status))throw new PlatformError(409,'Já existe um pagamento em aberto. Confira o pagamento anterior antes de escolher outro plano.');
  if(existing.exists){const data=existing.data();if(['checkout_ready','pending','in_process','rejected'].includes(data.status)&&data.url)return {id,data,reused:true};throw new PlatformError(409,'Já existe uma tentativa para esta contratação. Confira seu resultado ou procure o suporte.');}
  const data={empresaId:company.empresaId,planId:input.planId,planName:String(p.name||'SM'),amountCents:p.amountCents,interval:p.interval,currency:'BRL',mode:'live',status:'checkout_creating',collectorId:config.collectorId,previousPeriodId:old?.id||null,createdAt:now,createdBy:identity.uid,automaticBilling:false,renewalPreference:'manual',acceptance:{uid:identity.uid,at:now,version:config.termsVersion,contentId:config.termsContentId,url:config.termsUrl}};
  tx.set(ref,data);tx.set(lockRef,{chargeId:id,updatedAt:now});return {id,data};
 });
 if(reservation.reused)return publicCharge(reservation.data,reservation.id);
 try{
  const pref=await provider(config,'/checkout/preferences',{items:[{id:reservation.id,title:reservation.data.planName,currency_id:'BRL',quantity:1,unit_price:reservation.data.amountCents/100}],external_reference:reservation.id,notification_url:config.origin+'/.netlify/functions/mercadopago-live-webhook',back_urls:{success:config.origin+'/pagamento/?retorno=1',pending:config.origin+'/pagamento/?retorno=1',failure:config.origin+'/pagamento/?retorno=1'}},request);
  const url=new URL(pref.init_point);if(url.protocol!=='https:'||!/(^|\.)mercadopago\.(com|com\.br)$/.test(url.hostname)||url.hostname.startsWith('sandbox.')||String(pref.collector_id)!==config.collectorId||pref.external_reference!==reservation.id||!pref.id)throw new PlatformError(502,'O provedor não retornou um checkout de produção válido.');
  await db.runTransaction(async tx=>{const ref=db.doc(`${root}/live_charges/${reservation.id}`),snap=await tx.get(ref);if(!snap.exists)throw new PlatformError(409,'Contratação não encontrada.');if(snap.data().status==='checkout_creating')tx.update(ref,{status:'checkout_ready',url:url.href,preferenceId:String(pref.id)});});
  return publicCharge({...reservation.data,status:'checkout_ready',url:url.href},reservation.id);
 }catch(error){await db.runTransaction(async tx=>{const ref=db.doc(`${root}/live_charges/${reservation.id}`),snap=await tx.get(ref);if(snap.exists&&snap.data().status==='checkout_creating')tx.update(ref,{status:'checkout_review'});});throw error;}
}
export async function confirmLivePayment({db,config,paymentId,chargeId,request=fetch,now=Date.now()}){
 // Confirmation remains available when new checkout creation is disabled.
 if(!config.token||config.token.startsWith('TEST-')||!/^\d+$/.test(config.collectorId||''))throw new PlatformError(503,'Confirmação de produção não configurada.');
 await seller(config,request);
 if(!paymentId){if(!valid(chargeId))throw new PlatformError(400,'Pagamento inválido.');const search=await provider(config,'/v1/payments/search?external_reference='+encodeURIComponent(chargeId)+'&sort=date_created&criteria=desc&limit=20',null,request);const candidates=(search.results||[]).filter(p=>p.external_reference===chargeId);const found=candidates.find(p=>p.status==='approved'||p.status==='refunded'||p.status==='charged_back')||candidates[0];if(!found)return {status:'not_found'};paymentId=String(found.id);}
 if(!/^\d{1,30}$/.test(String(paymentId)))throw new PlatformError(400,'Pagamento inválido.');
 const payment=await provider(config,'/v1/payments/'+paymentId,null,request);
 if(String(payment.id)!==String(paymentId)||payment.live_mode!==true||String(payment.collector_id)!==config.collectorId||!valid(payment.external_reference)||(chargeId&&payment.external_reference!==chargeId))throw new PlatformError(409,'Pagamento incompatível com o ambiente de produção.');
 return db.runTransaction(async tx=>{
  const ref=db.doc(`${root}/live_charges/${payment.external_reference}`),snap=await tx.get(ref);if(!snap.exists)return {status:'ignored'};
  const charge=snap.data();if(charge.mode!=='live'||charge.collectorId!==config.collectorId||payment.currency_id!=='BRL'||!Number.isFinite(Number(payment.transaction_amount))||Math.abs(Number(payment.transaction_amount)*100-charge.amountCents)>.001)throw new PlatformError(409,'Valor, moeda ou recebedor do pagamento divergente.');
  const periodRef=db.doc(`${root}/live_contract_periods/${charge.empresaId}`),receiptRef=db.doc(`plataforma_admin/live_payment_receipts/payments/${payment.id}`),accessRef=db.doc(`empresas/${charge.empresaId}/acesso/plano`);
  const [periodSnap,receipt,accessPolicy]=await Promise.all([tx.get(periodRef),tx.get(receiptRef),tx.get(accessRef)]),current=periodSnap.exists?periodSnap.data():null;
  if(receipt.exists&&receipt.data().chargeId!==snap.id)throw new PlatformError(409,'Este pagamento já foi vinculado a outra contratação.');
  const reversed=['refunded','charged_back'].includes(payment.status)||Number(payment.transaction_amount_refunded||0)>0;
  if(reversed){tx.set(db.doc('plataforma_admin/audit/events/live-reversed-'+payment.id),{action:'payment.live.reversed',empresaId:charge.empresaId,chargeId:snap.id,paymentId:String(payment.id),at:now,status:payment.status,partialRefund:Number(payment.transaction_amount_refunded||0)>0});tx.update(ref,{status:payment.status==='charged_back'?'charged_back':'refunded',reversedAt:now,paymentId:String(payment.id)});if(current?.paymentId===String(payment.id)&&!current.revokedAt){tx.set(db.doc(`${root}/subscriptions/${charge.empresaId}`),{status:'past_due',billingMode:'live',updatedAt:now},{merge:true});tx.update(periodRef,{revokedAt:now,revocationReason:payment.status});if(!(accessPolicy.exists&&accessPolicy.data().mode==='owner_exempt'&&accessPolicy.data().enabled===false))tx.set(accessRef,billingAccessWindow(now-35*BILLING_ACCESS_DAY,{mode:'live',periodId:current.id,reason:'payment_reversed',updatedAt:now}));}return {status:'reversed'};}
  if(payment.status!=='approved'){if(!['approved','refunded','charged_back'].includes(charge.status))tx.update(ref,{status:payment.status||'pending'});return {status:payment.status||'pending'};}
  if(charge.status==='approved'){if(charge.paymentId!==String(payment.id)){tx.set(receiptRef,{chargeId:snap.id,empresaId:charge.empresaId,at:now,review:true});tx.update(ref,{duplicatePaymentReview:true});return {status:'duplicate_payment_review',periodApplied:false};}return {status:'approved',periodApplied:charge.periodApplied===true,alreadyConfirmed:true};}
  if(['refunded','charged_back'].includes(charge.status))return {status:'reversed'};
  if((current?.id||null)!==(charge.previousPeriodId||null)||(current&&!current.revokedAt&&now<current.endsAt)){tx.update(ref,{status:'approved_review',paymentId:String(payment.id),periodApplied:false});return {status:'approved_review',periodApplied:false};}
  const approvedAt=Date.parse(payment.date_approved||'');if(!Number.isFinite(approvedAt)||approvedAt<charge.createdAt-300000||approvedAt>now+300000)throw new PlatformError(409,'Data de aprovação inválida.');
  const startsAt=Math.max(approvedAt,current&&!current.revokedAt?current.endsAt:0),endsAt=periodEnd(startsAt,charge.interval),period={id:randomUUID(),empresaId:charge.empresaId,mode:'live',planId:charge.planId,planName:charge.planName,amountCents:charge.amountCents,currency:'BRL',interval:charge.interval,startsAt,endsAt,renewalNoticeAt:endsAt-NOTICE_DAYS[charge.interval]*BILLING_ACCESS_DAY,paymentId:String(payment.id),chargeId:snap.id,automaticBilling:false};
  tx.update(ref,{status:'approved',paymentId:String(payment.id),confirmedAt:now,periodApplied:true});tx.set(periodRef,period);tx.set(receiptRef,{chargeId:snap.id,empresaId:charge.empresaId,at:now});
  if(!(accessPolicy.exists&&accessPolicy.data().mode==='owner_exempt'&&accessPolicy.data().enabled===false))tx.set(accessRef,billingAccessWindow(endsAt,{mode:'live',periodId:period.id,source:'verified_live_payment',updatedAt:now}));
  tx.set(db.doc(`${root}/subscriptions/${charge.empresaId}`),{empresaId:charge.empresaId,planId:charge.planId,status:'active',billingMode:'live',automaticBilling:false,renewalPreference:'manual',currentPeriodId:period.id,updatedAt:now},{merge:true});
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'payment.live.approved',empresaId:charge.empresaId,chargeId:snap.id,paymentId:String(payment.id),at:now,period});return {status:'approved',periodApplied:true};
 });
}

export async function inspectLiveConnection(config,request=fetch){
 if(!config.token||config.token.startsWith('TEST-'))throw new PlatformError(503,'Cadastre o Access Token de produção no servidor.');
 const account=await provider(config,'/users/me',null,request);
 const collectorId=String(account.id||'');
 if(!/^\d{1,30}$/.test(collectorId)||account.tags?.includes('test_user'))throw new PlatformError(409,'A credencial não pertence a uma conta real de produção.');
 if(config.collectorId&&config.collectorId!==collectorId)throw new PlatformError(409,'O ID configurado não corresponde à conta recebedora da credencial.');
 return {ok:true,collectorId,ready:config.ready,missing:config.missing};
}
