import {randomUUID} from 'node:crypto';
import {PlatformError} from './platform.mjs';
// Called only after platform-owner authentication. Never accepts a caller-supplied UID/company.
export async function recoverLegacyCompany(db,identity,input,now=Date.now()){
 return db.runTransaction(async tx=>{
  const memberRef=db.doc('membros/'+identity.uid),memberSnap=await tx.get(memberRef),member=memberSnap.exists?memberSnap.data():null;
  if(member?.ativo!==true||typeof member.empresaId!=='string'||!/^[-\w]{1,120}$/.test(member.empresaId))throw new PlatformError(409,'Sua conta não possui um vínculo ativo de empresa para recuperar.');
  const id=member.empresaId,companyRef=db.doc('empresas/'+id),billingRef=db.doc('plataforma_admin/billing/companies/'+id),profileRef=db.doc('empresas/'+id+'/dados/sm2_empresas_perfis_dev/registros/'+id);
  const [companySnap,billingSnap,profileSnap]=await Promise.all([tx.get(companyRef),tx.get(billingRef),tx.get(profileRef)]);
  const company=companySnap.exists?companySnap.data():{},billing=billingSnap.exists?billingSnap.data():{},profile=profileSnap.exists?profileSnap.data():{};
  for(const record of [company,billing])if(record.ownerUid&&record.ownerUid!==identity.uid)throw new PlatformError(409,'Esta empresa possui outro responsável registrado. Nenhuma alteração foi feita.');
  if(company.ownerUid!==identity.uid&&(member.permissionsVersion||member.papel&&member.papel!=='admin'))throw new PlatformError(409,'O vínculo está registrado como funcionário. É necessário conferir o responsável antes de recuperar.');
  const name=String(billing.name||company.nome||profile.nomeFantasia||profile.razaoSocial||profile.nome||id).slice(0,120);
  const detail={empresaId:id,name,email:identity.email||'',alreadyLinked:company.ownerUid===identity.uid&&member.papel==='admin'&&billingSnap.exists};
  if(input.action==='company.legacy.inspect')return detail;
  if(input.action!=='company.legacy.recover'||input.expectedEmpresaId!==id)throw new PlatformError(409,'Confira novamente a empresa antes de recuperar.');
  tx.set(companyRef,{ownerUid:identity.uid,...(!companySnap.exists?{nome:name,criadoEm:now}:{})},{merge:true});
  tx.update(memberRef,{papel:'admin'});
  tx.set(billingRef,{empresaId:id,name,ownerUid:identity.uid,...(!billingSnap.exists?{createdAt:now,email:identity.email||''}:{}),updatedAt:now,updatedBy:identity.uid,legacyLinkedAt:now},{merge:true});
  tx.create(db.doc('plataforma_admin/audit/events/'+randomUUID()),{action:input.action,empresaId:id,uid:identity.uid,at:now});
  return {...detail,ok:true};
 });
}
