import {randomUUID} from 'node:crypto';
import {PlatformError} from './platform.mjs';
const validId=value=>typeof value==='string'&&/^[-A-Za-z0-9_]{1,120}$/.test(value);
const billing='plataforma_admin/billing';
export function companyReferences(db,id){
  if(!validId(id))throw new PlatformError(400,'Empresa inválida.');
  return {company:db.doc(`${billing}/companies/${id}`),subscription:db.doc(`${billing}/subscriptions/${id}`),
    profile:db.doc(`empresas/${id}/dados/sm2_empresas_perfis_dev/registros/${id}`),
    members:db.collection('membros').where('empresaId','==',id).limit(401)};
}
export function trialConfiguration(input,now=Date.now()){
  if(!['indefinite','dated'].includes(input.mode))throw new PlatformError(400,'Escolha o tipo de teste gratuito.');
  if(input.mode==='indefinite')return {trialMode:'indefinite',trialEndDate:null,trialEndsAt:null,notice:null};
  const date=input.endDate;
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw new PlatformError(400,'Informe uma data válida.');
  const end=Date.parse(date+'T23:59:59-03:00');
  if(end<=now)throw new PlatformError(400,'Escolha uma data futura para avisar a empresa.');
  return {trialMode:'dated',trialEndDate:date,trialEndsAt:end,notice:{kind:'trial_end',endDate:date,endsAt:end,updatedAt:now}};
}
export async function companyDetail(db,id){
  const refs=companyReferences(db,id);
  const [company,subscription,profile,members,accessPolicy]=await Promise.all([refs.company.get(),refs.subscription.get(),refs.profile.get(),refs.members.get(),db.doc(`empresas/${id}/acesso/plano`).get()]);
  if(!company.exists)throw new PlatformError(404,'Empresa não encontrada na plataforma.');
  return {accessPolicy:accessPolicy.exists?accessPolicy.data():null,company:{...company.data(),id:company.id},subscription:subscription.exists?subscription.data():null,profile:profile.exists?profile.data():null,
    members:members.docs.slice(0,400).map(doc=>({uid:doc.id,ativo:doc.data().ativo===true,suspendedByPlatform:doc.data().suspensoPelaPlataforma===true})),
    membersTruncated:members.size>400};
}
export async function manageCompany(db,input,uid,now=Date.now()){
  const id=input.empresaId,refs=companyReferences(db,id);
  if(!['company.access','trial.save'].includes(input.action))throw new PlatformError(400,'Ação inválida.');
  if(input.action==='company.access'&&!['active','suspended'].includes(input.accessStatus))throw new PlatformError(400,'Situação de acesso inválida.');
  const reason=String(input.reason||'').trim();if(reason.length>300)throw new PlatformError(400,'Use até 300 caracteres no motivo.');
  const trial=input.action==='trial.save'?trialConfiguration(input,now):null;
  return db.runTransaction(async tx=>{
    const [company,subscription,members]=await Promise.all([tx.get(refs.company),tx.get(refs.subscription),tx.get(refs.members)]);
    if(!company.exists)throw new PlatformError(404,'Empresa não encontrada.');
    if(members.size>400)throw new PlatformError(409,'Esta empresa exige uma operação em lote maior. Nenhuma alteração foi aplicada.');
    if(input.expectedUpdatedAt!==undefined&&Number(company.data().updatedAt||company.data().createdAt||0)!==Number(input.expectedUpdatedAt))throw new PlatformError(409,'O cadastro mudou em outra tela. Atualize os detalhes antes de salvar.');
    if(trial&&subscription.exists&&subscription.data().status!=='trial')throw new PlatformError(409,'Esta assinatura não está em teste gratuito.');
    let changed=0;
    if(input.action==='company.access'){
      const suspend=input.accessStatus==='suspended';
      for(const member of members.docs){
        const data=member.data();
        if(suspend&&data.ativo===true){tx.update(member.ref,{ativo:false,suspensoPelaPlataforma:true,acessoAtualizadoEm:now});changed++;}
        if(!suspend&&data.suspensoPelaPlataforma===true){tx.update(member.ref,{ativo:true,suspensoPelaPlataforma:false,acessoAtualizadoEm:now});changed++;}
      }
      tx.set(refs.company,{accessStatus:input.accessStatus,accessReason:reason,updatedAt:now,updatedBy:uid},{merge:true});
    }else{
      const {notice,...configuration}=trial;
      tx.set(refs.subscription,{empresaId:id,status:'trial',...configuration,automaticBilling:false,updatedAt:now,updatedBy:uid},{merge:true});
      for(const member of members.docs)tx.update(member.ref,{avisoPlataforma:trial.notice,acessoAtualizadoEm:now});
      tx.set(refs.company,{updatedAt:now,updatedBy:uid},{merge:true});
    }
    tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:input.action,empresaId:id,uid,at:now,
      ...(trial?{trialMode:trial.trialMode,trialEndDate:trial.trialEndDate}:{accessStatus:input.accessStatus,reason,membersChanged:changed})});
    return {ok:true,membersChanged:changed};
  });
}
