import {randomUUID} from 'node:crypto';
import {billingAccessWindow,BILLING_ACCESS_DAY,billingAccessState} from '../../../public/billing-access.mjs';
import {PlatformError} from './platform.mjs';
export {billingAccessState};
export const billingAccessRef=(db,empresaId)=>db.doc(`empresas/${empresaId}/acesso/plano`);
export async function simulateBillingAccess(db,input,uid,now=Date.now()){
 if(typeof input.empresaId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(input.empresaId)||!['active','grace','readonly','settings','payment','off'].includes(input.phase))throw new PlatformError(400,'Empresa ou fase inválida.');
 const companyRef=db.doc(`plataforma_admin/billing/companies/${input.empresaId}`),policyRef=billingAccessRef(db,input.empresaId);
 return db.runTransaction(async tx=>{
  const [company,policy]=await Promise.all([tx.get(companyRef),tx.get(policyRef)]);
  if(!company.exists)throw new PlatformError(404,'Empresa não encontrada.');
  if(Number(input.expectedUpdatedAt)!==Number(company.data().updatedAt||company.data().createdAt||0))throw new PlatformError(409,'Atualize os detalhes da empresa antes de simular.');
  if(policy.exists&&policy.data().enabled===true&&policy.data().mode!=='test')throw new PlatformError(409,'A simulação não pode substituir uma regra de acesso real.');
  const offsets={active:1,grace:-2,readonly:-6,settings:-36,payment:30};
  const next=input.phase==='off'?{enabled:false,mode:'test',updatedAt:now,updatedBy:uid}:billingAccessWindow(now+offsets[input.phase]*BILLING_ACCESS_DAY,{mode:'test',simulationPhase:input.phase,updatedAt:now,updatedBy:uid});
  tx.set(policyRef,next);tx.set(companyRef,{billingAccessTestEnabled:input.phase!=='off',updatedAt:now,updatedBy:uid},{merge:true});
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'billing.access.simulate',empresaId:input.empresaId,uid,at:now,phase:input.phase,previous:policy.exists?policy.data():null,policy:next});
  return {ok:true,access:billingAccessState(next,now)};
 });
}
// A validated payment only restores companies explicitly enrolled in this test.
export async function readBillingAccessProjection(tx,db,empresaId){
 const ref=billingAccessRef(db,empresaId),snapshot=await tx.get(ref);
 return {ref,enabled:snapshot.exists&&snapshot.data().enabled===true&&snapshot.data().mode==='test'};
}
export function projectPaidTestAccess(tx,projection,period,now){
 if(projection.enabled)tx.set(projection.ref,billingAccessWindow(period.endsAt,{mode:'test',periodId:period.id,source:'verified_test_period',updatedAt:now}));
}
