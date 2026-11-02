import {randomUUID} from 'node:crypto';
import {PlatformError} from './platform.mjs';

// Entry point is restricted to the authenticated platform owner by platform-admin.
// The target comes exclusively from that owner's membership, never from input.
export async function exemptOwnerCompany(db,identity,now=Date.now()){
 if(!identity.emailVerified)throw new PlatformError(403,'Confirme seu e-mail para continuar.');
 return db.runTransaction(async tx=>{
  const member=await tx.get(db.doc('membros/'+identity.uid));
  const m=member.exists?member.data():null;
  if(m?.ativo!==true||typeof m.empresaId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(m.empresaId))throw new PlatformError(403,'Sua conta precisa estar vinculada à sua empresa.');
  const id=m.empresaId,companyRef=db.doc('empresas/'+id),billingRef=db.doc('plataforma_admin/billing/companies/'+id),policyRef=db.doc(`empresas/${id}/acesso/plano`);
  const [company,billing,policy]=await Promise.all([tx.get(companyRef),tx.get(billingRef),tx.get(policyRef)]);
  if(!company.exists||!billing.exists||company.data().ownerUid!==identity.uid||billing.data().ownerUid!==identity.uid)throw new PlatformError(403,'A isenção exige que você seja o responsável pela empresa vinculada.');
  if(billing.data().accessStatus==='suspended')throw new PlatformError(409,'Reative a empresa antes de aplicar a isenção.');
  if(policy.exists&&policy.data().mode==='owner_exempt'&&policy.data().enabled===false)return {ok:true,empresaId:id,alreadyExempt:true};
  const next={enabled:false,mode:'owner_exempt',source:'platform_owner',exemptedBy:identity.uid,updatedAt:now};
  tx.set(policyRef,next);
  tx.set(billingRef,{ownerExempt:true,exemptionOwnerUid:identity.uid,updatedAt:now,updatedBy:identity.uid},{merge:true});
  tx.create(db.doc('plataforma_admin/audit/events/'+randomUUID()),{action:'company.owner_exemption',empresaId:id,uid:identity.uid,at:now,previousPolicy:policy.exists?policy.data():null});
  return {ok:true,empresaId:id,alreadyExempt:false};
 });
}
