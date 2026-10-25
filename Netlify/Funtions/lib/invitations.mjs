import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { PlatformError } from './platform.mjs';
import authorizedInvitations from './owner-invitations.json' with { type:'json' };

export const invitationRef = (db,token) => {
  if(typeof token!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(token))throw new PlatformError(400,'Convite inválido.');
  return db.doc('plataforma_admin/onboarding/invites/'+createHash('sha256').update(token).digest('hex'));
};
export async function createInvitation(db,input,uid,now=Date.now()) {
  const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase();
  if(name.length>120||email.length>254||(email&&! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))throw new PlatformError(400,'Confira o nome da empresa e o e-mail.');
  const token=randomBytes(32).toString('base64url'),empresaId='empresa-'+randomUUID();
  await invitationRef(db,token).create({name,email,empresaId,status:'pending',trialMode:'indefinite',trialEndsAt:null,createdAt:now,createdBy:uid});
  return {token,empresaId};
}
export async function redeemInvitation(db,token,identity,now=Date.now(),registration={}) {
  if(!identity.emailVerified)throw new PlatformError(403,'Confirme seu e-mail antes de concluir o cadastro.');
  const invite=invitationRef(db,token),member=db.doc('membros/'+identity.uid);
  return db.runTransaction(async tx=>{
    const [invitation,membership]=await Promise.all([tx.get(invite),tx.get(member)]);
    const seed=authorizedInvitations[invite.path.split('/').at(-1)];
    if(!invitation.exists&&!seed)throw new PlatformError(404,'Convite não encontrado. Solicite um novo convite ao administrador.');
    const data=invitation.exists?invitation.data():seed;
    const email=String(identity.email||'').toLowerCase();
    if(!email||(data.email&&email!==data.email))throw new PlatformError(403,'Entre com o e-mail que recebeu este convite.');
    if(data.status==='redeemed'&&data.redeemedBy===identity.uid&&membership.exists&&membership.data().empresaId===data.empresaId&&membership.data().ativo===true)return {empresaId:data.empresaId};
    if(data.status!=='pending')throw new PlatformError(409,'Este convite já foi utilizado ou cancelado.');
    if(membership.exists)throw new PlatformError(409,'Esta conta já possui um vínculo. Peça orientação ao administrador.');
    const name=data.name||String(registration.name||'').trim();
    if(!name||name.length>120)throw new PlatformError(400,'Informe o nome da empresa.');
    const root='plataforma_admin/billing';
    tx.create(member,{empresaId:data.empresaId,ativo:true,papel:'admin',criadoEm:now});
    tx.create(db.doc('empresas/'+data.empresaId),{nome:name,ownerUid:identity.uid,criadoEm:now});
    tx.create(db.doc(`empresas/${data.empresaId}/dados/sm2_empresas_perfis_dev/registros/${data.empresaId}`),{id:data.empresaId,nome:name,email,criadoEm:now,atualizadoEm:now});
    tx.create(db.doc(root+'/companies/'+data.empresaId),{empresaId:data.empresaId,name,email,ownerUid:identity.uid,createdAt:now});
    tx.create(db.doc(root+'/subscriptions/'+data.empresaId),{empresaId:data.empresaId,planId:null,status:'trial',trialMode:'indefinite',trialEndsAt:null,automaticBilling:false,source:'owner_invitation',createdAt:now});
    const used={status:'redeemed',redeemedBy:identity.uid,redeemedAt:now};
    if(invitation.exists)tx.update(invite,used);else tx.create(invite,{...data,...used,email,name});
    return {empresaId:data.empresaId};
  });
}
