import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {PlatformError} from './platform.mjs';
import {normalizePermissions} from '../../../public/employee-permissions.mjs';
import {billingAccessRef,billingAccessState} from './billing-access.mjs';
const validId=x=>typeof x==='string'&&/^[-\w]{1,128}$/.test(x);
export async function employeeOwnerContext(db,identity,read=ref=>ref.get(),write=false,now=Date.now()){
 if(!identity.emailVerified)throw new PlatformError(403,'Confirme seu e-mail para gerenciar funcionários.');
 const member=await read(db.doc('membros/'+identity.uid)),m=member.exists?member.data():null;
 if(m?.ativo!==true||!validId(m.empresaId))throw new PlatformError(403,'Conta sem empresa ativa.');
 const company=await read(db.doc('empresas/'+m.empresaId));
 if(company.exists&&company.data().ownerUid?company.data().ownerUid!==identity.uid:m.papel!=='admin')throw new PlatformError(403,'Somente o responsável pela empresa pode gerenciar funcionários.');
 const policy=await read(billingAccessRef(db,m.empresaId));
 if(write&&!billingAccessState(policy.exists?policy.data():null,now).write)throw new PlatformError(403,'Renove o plano para alterar funcionários.');
 return {empresaId:m.empresaId,ownerUid:identity.uid};
}
function permissions(input){try{return normalizePermissions(input);}catch{throw new PlatformError(400,'Confira as permissões do funcionário.');}}
function details(input){const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase();if(!name||name.length>120||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new PlatformError(400,'Informe o nome e um e-mail válido.');return {name,email};}
function inviteRef(db,empresaId,token){if(!validId(empresaId)||typeof token!=='string'||!/^[-\w]{43}$/.test(token))throw new PlatformError(400,'Convite inválido.');return db.doc(`empresas/${empresaId}/convitesFuncionarios/${createHash('sha256').update(token).digest('hex')}`);}
function audit(tx,db,data){tx.create(db.doc('plataforma_admin/audit/events/'+randomUUID()),data);}
export async function listEmployees(db,identity){
 const context=await employeeOwnerContext(db,identity);
 const [members,invites]=await Promise.all([db.collection('membros').where('empresaId','==',context.empresaId).limit(101).get(),db.collection(`empresas/${context.empresaId}/convitesFuncionarios`).where('status','==','pending').limit(101).get()]);
 if(members.docs.length>100||invites.docs.length>100)throw new PlatformError(409,'Limite da lista atingido. Entre em contato com a plataforma.');
 return {empresaId:context.empresaId,members:members.docs.filter(d=>d.id!==identity.uid).map(d=>({uid:d.id,name:d.data().nome||'Funcionário',email:d.data().email||'',role:d.data().funcao||'Personalizado',active:d.data().ativo===true,permissions:d.data().permissoes||{},revision:d.data().permissionsRevision||0})),invites:invites.docs.map(d=>({id:d.id,...details(d.data()),expiresAt:d.data().expiresAt,permissions:d.data().permissoes,revision:d.data().createdAt}))};
}
export async function createEmployeeInvite(db,identity,input,now=Date.now()){
 const data=details(input),permissoes=permissions(input.permissions),token=randomBytes(32).toString('base64url');
 const result=await db.runTransaction(async tx=>{
  const company=await employeeOwnerContext(db,identity,r=>tx.get(r),true,now);
  const ref=inviteRef(db,company.empresaId,token);
  tx.create(ref,{...data,empresaId:company.empresaId,status:'pending',permissoes,funcao:['Venda','Estoque'].includes(input.role)?input.role:'Personalizado',createdAt:now,createdBy:identity.uid,expiresAt:now+7*86400000});
  audit(tx,db,{action:'employee.invite',empresaId:company.empresaId,uid:identity.uid,email:data.email,at:now});return {empresaId:company.empresaId};
 });return {...result,token};
}
export async function updateEmployee(db,identity,input,now=Date.now()){
 if(!validId(input.uid)||typeof input.active!=='boolean'||!Number.isSafeInteger(input.revision))throw new PlatformError(400,'Funcionário inválido.');
 const permissoes=permissions(input.permissions);
 return db.runTransaction(async tx=>{
  const context=await employeeOwnerContext(db,identity,r=>tx.get(r),true,now);
  if(input.uid===context.ownerUid)throw new PlatformError(403,'O responsável mantém acesso administrativo.');
  const ref=db.doc('membros/'+input.uid),snapshot=await tx.get(ref),m=snapshot.exists?snapshot.data():null;
  if(m?.empresaId!==context.empresaId||m.papel!=='employee')throw new PlatformError(403,'Funcionário não pertence a esta empresa.');
  if((m.permissionsRevision||0)!==input.revision)throw new PlatformError(409,'As permissões mudaram. Atualize a lista antes de salvar.');
  if(m.suspensoPelaPlataforma===true)throw new PlatformError(403,'O acesso está suspenso pela plataforma.');
  const next={ativo:input.active,permissoes,permissionsVersion:1,permissionsRevision:input.revision+1,permissionsUpdatedAt:now};
  tx.set(ref,next,{merge:true});audit(tx,db,{action:'employee.permissions',empresaId:context.empresaId,uid:identity.uid,targetUid:input.uid,previous:{ativo:m.ativo,permissoes:m.permissoes||{}},next,at:now});return {ok:true};
 });
}
export async function cancelEmployeeInvite(db,identity,input,now=Date.now()){
 if(typeof input.id!=='string'||! /^[a-f0-9]{64}$/.test(input.id))throw new PlatformError(400,'Convite inválido.');
 return db.runTransaction(async tx=>{const c=await employeeOwnerContext(db,identity,r=>tx.get(r),true,now),ref=db.doc(`empresas/${c.empresaId}/convitesFuncionarios/${input.id}`),s=await tx.get(ref);if(!s.exists||s.data().status!=='pending')throw new PlatformError(409,'Convite já encerrado.');tx.update(ref,{status:'cancelled',cancelledAt:now});audit(tx,db,{action:'employee.invite.cancel',empresaId:c.empresaId,uid:identity.uid,at:now});return {ok:true};});
}
export async function redeemEmployeeInvite(db,identity,input,now=Date.now()){
 if(!identity.emailVerified)throw new PlatformError(403,'Confirme seu e-mail antes de entrar na empresa.');
 const invite=inviteRef(db,input.empresaId,input.token),member=db.doc('membros/'+identity.uid);
 return db.runTransaction(async tx=>{
  const [invitation,existing,company,ownerPolicy]=await Promise.all([tx.get(invite),tx.get(member),tx.get(db.doc('empresas/'+input.empresaId)),tx.get(billingAccessRef(db,input.empresaId))]);
  const data=invitation.exists?invitation.data():null;
  if(!data||data.email!==String(identity.email||'').toLowerCase())throw new PlatformError(403,'Abra um convite válido para o seu e-mail.');
  if(data.status==='redeemed'&&data.redeemedBy===identity.uid&&existing.exists&&existing.data().empresaId===input.empresaId&&existing.data().ativo===true)return {ok:true};
  if(data.status!=='pending'||data.expiresAt<=now)throw new PlatformError(409,'Convite usado, cancelado ou vencido. Peça outro ao administrador.');
  if(existing.exists)throw new PlatformError(409,'Esta conta já tem vínculo. Use outra conta ou fale com o administrador.');
  if(!billingAccessState(ownerPolicy.exists?ownerPolicy.data():null,now).write)throw new PlatformError(403,'A empresa precisa renovar o acesso antes de cadastrar funcionários.');
  const owner=await tx.get(db.doc('membros/'+(company.exists&&company.data().ownerUid?company.data().ownerUid:data.createdBy)));
  if(!owner.exists||owner.data().ativo!==true||owner.data().empresaId!==input.empresaId)throw new PlatformError(403,'Empresa sem acesso ativo.');
  tx.create(member,{empresaId:input.empresaId,ativo:true,papel:'employee',nome:data.name,email:data.email,funcao:data.funcao,permissionsVersion:1,permissoes:permissions(data.permissoes),permissionsRevision:1,criadoEm:now});
  tx.update(invite,{status:'redeemed',redeemedBy:identity.uid,redeemedAt:now});audit(tx,db,{action:'employee.join',empresaId:input.empresaId,uid:identity.uid,at:now});return {ok:true};
 });
}
