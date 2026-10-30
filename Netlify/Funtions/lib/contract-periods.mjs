import {randomUUID} from 'node:crypto';
import {PlatformError} from './platform.mjs';
const root='plataforma_admin/billing';
const DAY=86400000,BRT=3*3600000;
export const NOTICE_DAYS={monthly:7,yearly:30};
const validId=value=>typeof value==='string'&&/^[-A-Za-z0-9_]{1,120}$/.test(value);
export function periodEnd(startsAt,interval){
 if(!Number.isFinite(startsAt)||!['monthly','yearly'].includes(interval))throw new PlatformError(400,'Período inválido.');
 // Business calendar is Brasília (UTC-3), consistent with the platform's trial dates.
 const local=new Date(startsAt-BRT),day=local.getUTCDate();
 local.setUTCDate(1);local.setUTCMonth(local.getUTCMonth()+(interval==='yearly'?12:1));
 const last=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth()+1,0)).getUTCDate();
 local.setUTCDate(Math.min(day,last));return local.getTime()+BRT;
}
export function createTestPeriod(terms,startsAt,extra={}){
 if(!validId(terms.planId)||!Number.isSafeInteger(terms.amountCents)||terms.amountCents<0||terms.amountCents>100000000||!['monthly','yearly'].includes(terms.interval))throw new PlatformError(400,'Condições do período inválidas.');
 const endsAt=periodEnd(startsAt,terms.interval);
 return {...extra,id:randomUUID(),planId:terms.planId,planName:String(terms.planName||'Plano'),amountCents:terms.amountCents,currency:'BRL',interval:terms.interval,startsAt,endsAt,renewalNoticeAt:endsAt-NOTICE_DAYS[terms.interval]*DAY,mode:'test',automaticBilling:false};
}
export function periodView(period,currentPlan,now=Date.now()){
 if(!period||period.mode!=='test')return null;
 const active=now<period.endsAt,renewalOpen=now>=period.renewalNoticeAt;
 const next=currentPlan&&currentPlan.active!==false?{name:currentPlan.name,amountCents:currentPlan.amountCents,interval:currentPlan.interval}:null;
 return {...period,displayName:currentPlan?.name||period.planName,active,renewalOpen,expired:!active,nextTerms:renewalOpen?next:null,priceChanged:renewalOpen&&next?next.amountCents!==period.amountCents||next.interval!==period.interval:false};
}
export async function startRequestedTestPeriod(db,input,uid,now=Date.now()){
 if(!validId(input.empresaId)||!Number.isSafeInteger(input.expectedRequestedAt))throw new PlatformError(400,'Solicitação inválida.');
 const requestRef=db.doc(`${root}/contract_requests/${input.empresaId}`),periodRef=db.doc(`${root}/test_contract_periods/${input.empresaId}`);
 return db.runTransaction(async tx=>{
  const [request,existing,company]=await Promise.all([tx.get(requestRef),tx.get(periodRef),tx.get(db.doc(`${root}/companies/${input.empresaId}`))]);
  if(!company.exists||!request.exists||request.data().status!=='requested_test'||request.data().simulationOnly!==true)throw new PlatformError(404,'Solicitação de teste não encontrada.');
  const terms=request.data(),old=existing.exists?existing.data():null;
  if(terms.requestedAt!==input.expectedRequestedAt)throw new PlatformError(409,'A escolha mudou. Atualize as solicitações.');
  if(old?.sourceRequestAt===terms.requestedAt)return {ok:true,unchanged:true,period:old};
  if(old&&now<old.endsAt)throw new PlatformError(409,'Já existe um período vigente. O preço e a data final serão preservados até o vencimento.');
  if(old&&terms.requestedAt<old.renewalNoticeAt)throw new PlatformError(409,'Peça ao responsável uma nova escolha para a renovação.');
  const period=createTestPeriod(terms,now,{empresaId:input.empresaId,sourceRequestAt:terms.requestedAt,source:'admin_test',createdBy:uid});
  tx.set(periodRef,period);
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'contract.period.start_test',empresaId:input.empresaId,uid,at:now,period});
  return {ok:true,period};
 });
}
export function assertCheckoutPeriodAvailable(period,now=Date.now()){
 if(period?.mode==='test'&&now<period.endsAt)throw new PlatformError(409,'Esta empresa já tem um período de teste contratado vigente. Um novo valor só poderá ser aplicado na renovação.');
}
export function periodFromApprovedCharge(charge,payment,existing,now){
 if(charge.contractPeriodVersion!==1)return null;
 if((existing?.id||null)!==(charge.previousPeriodId||null))return null;
 if(existing&&now<existing.endsAt)return null;
 const approved=Date.parse(payment.date_approved||'');
 const startsAt=Number.isFinite(approved)&&approved<=now+300000?Math.max(approved,existing?.endsAt||0):now;
 return createTestPeriod(charge,startsAt,{empresaId:charge.empresaId,source:'payment_test',paymentId:String(payment.id)});
}

// Owner-only operation routed through platform-admin. Never shortens a paid period.
export async function endFreeTestPeriod(db,input,uid,now=Date.now()){
 if(!validId(input.empresaId)||!validId(input.expectedPeriodId))throw new PlatformError(400,'Período inválido.');
 return db.runTransaction(async tx=>{
  const ref=db.doc(`${root}/test_contract_periods/${input.empresaId}`);
  const [snapshot,company]=await Promise.all([tx.get(ref),tx.get(db.doc(`${root}/companies/${input.empresaId}`))]);
  if(!snapshot.exists||!company.exists)throw new PlatformError(404,'Simulação não encontrada.');
  const period=snapshot.data();
  if(period.id!==input.expectedPeriodId)throw new PlatformError(409,'O período mudou. Atualize a lista.');
  if(period.mode!=='test'||period.source!=='free_test'||period.amountCents!==0)throw new PlatformError(409,'Somente uma simulação gratuita pode ser encerrada para novo teste. Períodos pagos são preservados.');
  if(period.simulationEndedAt||now>=period.endsAt)return {ok:true,unchanged:true};
  const ended={...period,originalEndsAt:period.endsAt,originalRenewalNoticeAt:period.renewalNoticeAt,endsAt:now,renewalNoticeAt:now,simulationEndedAt:now,simulationEndedBy:uid};
  tx.set(ref,ended);
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'contract.free_test.end',empresaId:input.empresaId,uid,at:now,previousPeriod:period});
  return {ok:true};
 });
}

// Period identity is a version UUID; its Firestore document ID is the company.
export function serializeTestPeriods(snapshot){
 return snapshot.docs.map(document=>({...document.data(),empresaId:document.id}));
}
