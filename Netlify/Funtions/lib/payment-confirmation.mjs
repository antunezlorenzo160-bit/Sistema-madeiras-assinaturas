import {createHmac,timingSafeEqual} from 'node:crypto';
import {PlatformError} from './platform.mjs';
const billing='plataforma_admin/billing';
const valid=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(value);
export function verifyWebhook(req,secret,now=Date.now()){
 const reject=(status,message,supportCode)=>{throw Object.assign(new PlatformError(status,message),{supportCode});};
 if(!secret)reject(503,'Webhook de teste ainda não configurado.','WEBHOOK_SECRET_MISSING');
 const id=new URL(req.url).searchParams.get('data.id');
 const requestId=req.headers.get('x-request-id');
 if(!req.headers.get('x-signature'))reject(401,'Notificação sem assinatura.','WEBHOOK_SIGNATURE_MISSING');
 if(!id)reject(401,'Notificação sem ID na URL.','WEBHOOK_ID_MISSING');
 if(!requestId)reject(401,'Notificação sem identificador da requisição.','WEBHOOK_REQUEST_ID_MISSING');
 const parts=Object.fromEntries((req.headers.get('x-signature')||'').split(',').map(p=>p.trim().split('=')));
 if(!/^\d{1,30}$/.test(id||'')||!requestId||requestId.length>200||!/^\d{10,13}$/.test(parts.ts||'')||! /^[a-f0-9]{64}$/i.test(parts.v1||''))reject(401,'Notificação inválida.','WEBHOOK_SIGNATURE_FORMAT');
 const timestamp=Number(parts.ts)*(parts.ts.length===10?1000:1);
 if(Math.abs(now-timestamp)>300000)reject(401,'Notificação expirada.','WEBHOOK_TIMESTAMP_EXPIRED');
 const expected=createHmac('sha256',secret).update(`id:${id};request-id:${requestId};ts:${parts.ts};`).digest();
 if(!timingSafeEqual(expected,Buffer.from(parts.v1,'hex')))reject(401,'Assinatura inválida.','WEBHOOK_SIGNATURE_MISMATCH');
 return id;
}
export async function confirmTestPayment({db,paymentId,chargeId,token,request=fetch,now=Date.now()}){
 if(!token)throw new PlatformError(503,'Credencial de teste não configurada.');
 const call=async path=>{
  const r=await request('https://api.mercadopago.com'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new PlatformError(502,'Não foi possível consultar o pagamento no Mercado Pago.');
  return r.json();
 };
 const seller=await call('/users/me');
 const testSeller=Array.isArray(seller.tags)&&seller.tags.includes('test_user');
 if(!token.startsWith('TEST-')&&!testSeller)throw new PlatformError(409,'Somente pagamentos de teste são aceitos.');
 if(!paymentId){
  if(!valid(chargeId))throw new PlatformError(400,'Cobrança inválida.');
  const search=await call('/v1/payments/search?external_reference='+encodeURIComponent(chargeId)+'&sort=date_created&criteria=desc&limit=20');
  const candidates=(search.results||[]).filter(p=>p.external_reference===chargeId);
  const candidate=candidates.find(p=>p.status==='approved')||candidates[0];
  if(!candidate)return {ok:true,status:'not_found'};
  paymentId=String(candidate.id);
 }
 if(!/^\d{1,30}$/.test(String(paymentId)))throw new PlatformError(400,'Pagamento inválido.');
 const payment=await call('/v1/payments/'+paymentId);
 if(String(payment.id)!==String(paymentId)||!valid(payment.external_reference)||
    (chargeId&&payment.external_reference!==chargeId)||String(payment.collector_id)!==String(seller.id)||
    (payment.live_mode!==false&&!testSeller))throw new PlatformError(409,'Pagamento incompatível com este ambiente de teste.');
 const ref=db.doc(`${billing}/charges/${payment.external_reference}`);
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref);
  if(!snap.exists)throw new PlatformError(404,'Cobrança de teste não encontrada.');
  const charge=snap.data();
  if(!Number.isSafeInteger(charge.amountCents)||charge.amountCents<=0||charge.mode!=='test'||String(charge.sellerId)!==String(seller.id)||!valid(charge.empresaId)||!valid(charge.planId)||
     payment.currency_id!=='BRL'||Math.abs(Number(payment.transaction_amount)*100-charge.amountCents)>.001||!Number.isFinite(Number(payment.transaction_amount)))throw new PlatformError(409,'Empresa, vendedor, moeda ou valor divergente.');
  if(payment.status!=='approved')return {ok:true,status:payment.status||'pending'};
  if(charge.status==='test_payment_approved')return {ok:true,status:'approved',alreadyConfirmed:true};
  const subRef=db.doc(`${billing}/subscriptions/${charge.empresaId}`),sub=await tx.get(subRef);
  tx.update(ref,{status:'test_payment_approved',paymentId:String(payment.id),confirmedAt:now});
  // A sandbox payment never activates a real contract, changes access or ends a trial.
  if(sub.exists&&sub.data().planId===charge.planId)tx.set(subRef,{testPayment:{status:'approved',chargeId:ref.id,paymentId:String(payment.id),planId:charge.planId,amountCents:charge.amountCents,confirmedAt:now}},{merge:true});
  tx.create(db.doc(`plataforma_admin/audit/events/payment-test-${payment.id}`),{action:'payment.test.approved',chargeId:ref.id,empresaId:charge.empresaId,paymentId:String(payment.id),at:now});
  return {ok:true,status:'approved'};
 });
}
