import {createHash,randomUUID} from 'node:crypto';
import {PlatformError,requireManualTestCheckout} from './platform.mjs';
import {companyContext} from './company-contract.mjs';
import {assertCheckoutPeriodAvailable,createTestPeriod} from './contract-periods.mjs';
import {testCheckout} from './mercadopago.mjs';
import {confirmTestPayment} from './payment-confirmation.mjs';
const root='plataforma_admin/billing';
const validId=v=>typeof v==='string'&&/^[-A-Za-z0-9_]{1,120}$/.test(v);
export async function createCompanyTestCheckout({db,identity,input,base,token,webhookSecret,checkout=testCheckout,now=Date.now()}){
 if(input.simulationOnly!==true||!Number.isSafeInteger(input.expectedRequestedAt))throw new PlatformError(400,'Confira a solicitação de teste antes de continuar.');
 let origin;try{const url=new URL(base);if(url.protocol!=='https:')throw Error();origin=url.origin;}catch{throw new PlatformError(503,'Endereço da prévia não configurado.');}
 const reserved=await db.runTransaction(async tx=>{
  const company=await companyContext(db,identity,ref=>tx.get(ref));
  const requestRef=db.doc(`${root}/contract_requests/${company.empresaId}`),periodRef=db.doc(`${root}/test_contract_periods/${company.empresaId}`);
  const [request,period]=await Promise.all([tx.get(requestRef),tx.get(periodRef)]);
  if(!request.exists||request.data().requestedAt!==input.expectedRequestedAt||request.data().simulationOnly!==true||request.data().status!=='requested_test')throw new PlatformError(409,'A solicitação mudou. Atualize a página.');
  const terms=request.data();
  const id='company-'+createHash('sha256').update(company.empresaId+':'+terms.requestedAt).digest('hex').slice(0,48),ref=db.doc(`${root}/charges/${id}`);
  const saved=await tx.get(ref);
  if(saved.exists){
   const data=saved.data();
   if(data.empresaId!==company.empresaId||data.source!=='company_test')throw new PlatformError(409,'Pagamento incompatível com a empresa.');
   if(['test_checkout_created','test_payment_approved','test_free_period'].includes(data.status))return {reused:true,id,data};
   if(data.status==='checkout_creating'&&now-data.reservedAt<60000)throw new PlatformError(409,'O checkout está sendo preparado. Aguarde e atualize a página.');
  }
  assertCheckoutPeriodAvailable(period.exists?period.data():null,now);
  if(!validId(terms.planId))throw new PlatformError(409,'Plano inválido.');
  const plan=await tx.get(db.doc(`${root}/plans/${terms.planId}`));
  if(!plan.exists||plan.data().active===false||plan.data().amountCents!==terms.amountCents||plan.data().interval!==terms.interval||!Number.isSafeInteger(terms.amountCents)||terms.amountCents<0||terms.amountCents>100000000||!['monthly','yearly'].includes(terms.interval))throw new PlatformError(409,'O plano mudou. Peça à plataforma para revisar sua solicitação antes do pagamento.');
  if(terms.amountCents>0){requireManualTestCheckout(terms);if(!token||!webhookSecret)throw new PlatformError(503,'A plataforma precisa configurar o pagamento e a confirmação automática de teste.');}
  const data={empresaId:company.empresaId,planId:terms.planId,planName:terms.planName,amountCents:terms.amountCents,interval:terms.interval,mode:'test',source:'company_test',contractPeriodVersion:1,previousPeriodId:period.exists?period.data().id:null,sourceRequestAt:terms.requestedAt,status:terms.amountCents===0?'test_free_period':'checkout_creating',reservedAt:now,createdAt:saved.exists?saved.data().createdAt:now,createdBy:identity.uid};
  tx.set(ref,data);tx.set(requestRef,{...terms,checkoutId:id});
  if(terms.amountCents===0){
   const free=createTestPeriod(terms,now,{empresaId:company.empresaId,source:'free_test',sourceRequestAt:terms.requestedAt});
   tx.set(periodRef,free);
   tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'contract.free_test_period',empresaId:company.empresaId,uid:identity.uid,at:now,period:free});
  }
  return {id,data};
 });
 if(reserved.reused||reserved.data.status==='test_free_period')return {ok:true,id:reserved.id,status:reserved.data.status,url:reserved.data.url||'',mode:'test',unchanged:Boolean(reserved.reused)};
 try{
  const result=await checkout({token,amountCents:reserved.data.amountCents,title:reserved.data.planName,reference:reserved.id,returnUrl:new URL('/contratacao/?pagamento=retorno',origin).href,notificationUrl:new URL('/.netlify/functions/mercadopago-webhook',origin).href});
  await db.runTransaction(async tx=>{
   const ref=db.doc(`${root}/charges/${reserved.id}`),current=await tx.get(ref);
   if(!current.exists||current.data().status!=='checkout_creating')throw new PlatformError(409,'O estado do checkout mudou. Atualize a página.');
   tx.set(ref,{...current.data(),...result,status:'test_checkout_created'});
  });
  return {ok:true,id:reserved.id,status:'test_checkout_created',url:result.url,mode:'test'};
 }catch(error){
  await db.runTransaction(async tx=>{const ref=db.doc(`${root}/charges/${reserved.id}`),current=await tx.get(ref);if(current.exists&&current.data().status==='checkout_creating')tx.set(ref,{...current.data(),status:'checkout_failed'});});throw error;
 }
}
export async function verifyCompanyTestCheckout({db,identity,input,token,confirm=confirmTestPayment}){
 if(!validId(input.chargeId))throw new PlatformError(400,'Pagamento inválido.');
 const company=await companyContext(db,identity),charge=await db.doc(`${root}/charges/${input.chargeId}`).get();
 if(!charge.exists||charge.data().empresaId!==company.empresaId||charge.data().source!=='company_test'||charge.data().mode!=='test')throw new PlatformError(404,'Pagamento de teste não encontrado nesta empresa.');
 if(charge.data().status==='test_free_period')return {ok:true,status:'free'};
 if(!['test_checkout_created','test_payment_approved'].includes(charge.data().status))throw new PlatformError(409,'O checkout ainda não está disponível. Atualize a página.');
 return confirm({db,chargeId:charge.id,token});
}
