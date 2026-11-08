import {FINANCE_PREVIEW} from './finance-context.mjs';
import {PlatformError} from './platform.mjs';
import {resolveCompanyMemberRole} from './company-session.mjs';
import {billingAccessRef,billingAccessState} from './billing-access.mjs';
export function financeCollectionPath(empresaId,context=FINANCE_PREVIEW?'deploy-preview':'production'){return `empresas/${empresaId}/${context==='deploy-preview'?'financeiroPreviaRegistros':'financeiroRegistros'}`;}
export async function financeOwnerContext(db,identity,read=ref=>ref.get(),write=false,now=Date.now()){
 if(!identity.emailVerified)throw new PlatformError(403,'Confirme seu e-mail para acessar o financeiro.');
 const snapshot=await read(db.doc('membros/'+identity.uid)),member=snapshot.exists?snapshot.data():null;
 if(member?.ativo!==true||!/^[-\w]{1,120}$/.test(member.empresaId||''))throw new PlatformError(403,'Conta sem empresa ativa.');
 const company=await read(db.doc('empresas/'+member.empresaId));
 const role=resolveCompanyMemberRole(member,company.exists?company.data():null,identity);
 if(!role.roleContext.isCompanyOwner)throw new PlatformError(403,'O financeiro é exclusivo do responsável pela empresa.');
 const policy=await read(billingAccessRef(db,member.empresaId)),access=billingAccessState(policy.exists?policy.data():null,now);
 if(!access.read||write&&!access.write)throw new PlatformError(403,'Renove o acesso da empresa para '+(write?'alterar':'consultar')+' o financeiro.');
 return {empresaId:member.empresaId,canWrite:access.write};
}
