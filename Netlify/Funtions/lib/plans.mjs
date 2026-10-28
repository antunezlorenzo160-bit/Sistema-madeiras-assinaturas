import {randomUUID} from 'node:crypto';
import {PlatformError,validatePlan} from './platform.mjs';
export async function savePlan(db,input,uid,now=Date.now()){
 if(input.id!==undefined&&(typeof input.id!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(input.id)))throw new PlatformError(400,'Plano inválido.');
 let data;try{data=validatePlan(input);}catch(error){throw new PlatformError(400,error.message);}
 const ref=db.doc(`plataforma_admin/billing/plans/${input.id||randomUUID()}`);
 return db.runTransaction(async tx=>{
  const previous=await tx.get(ref);
  if(input.id&&!previous.exists)throw new PlatformError(404,'O plano não existe mais. Atualize a lista.');
  if(input.id&&(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision!==Number(previous.data().updatedAt||0)))throw new PlatformError(409,'O plano foi alterado em outra tela. Atualize a lista e abra a edição novamente.');
  const revision=Math.max(now,Number(previous.exists?previous.data().updatedAt||0:0)+1);
  tx.set(ref,{...data,active:previous.exists?previous.data().active!==false:data.active,updatedAt:revision,updatedBy:uid},{merge:true});
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:input.id?'plan.update':'plan.save',target:ref.path,uid,at:now,...(previous.exists?{previous:{name:previous.data().name,amountCents:previous.data().amountCents,interval:previous.data().interval}}:{}),next:{name:data.name,amountCents:data.amountCents,interval:data.interval}});
  return {ok:true,id:ref.id,revision};
 });
}

export async function renameCurrentPlansToSM(db,uid,now=Date.now()){
 const names=new Set(['Sistema','Sistema de Madeiras — Completo','Sistema de Madeiras — Completo Anual']);
 return db.runTransaction(async tx=>{
  const plans=await tx.get(db.collection('plataforma_admin/billing/plans').limit(201));
  if(plans.size>200)throw new PlatformError(409,'A lista de planos exige revisão antes de aplicar a alteração.');
  const targets=plans.docs.filter(doc=>{const p=doc.data();return p.active!==false&&names.has(p.name)&&['monthly','yearly'].includes(p.interval);});
  for(const doc of targets)tx.set(doc.ref,{name:'SM',updatedAt:Math.max(now,Number(doc.data().updatedAt||0)+1),updatedBy:uid},{merge:true});
  if(targets.length)tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'plan.rename_current_sm',uid,at:now,plans:targets.map(doc=>({id:doc.id,previousName:doc.data().name,nextName:'SM'}))});
  return {ok:true,renamed:targets.length};
 });
}

export async function planHasReferences(tx,db,planId){
 const snapshots=await Promise.all(['subscriptions','charges','contract_requests','test_contract_periods'].map(collection=>tx.get(db.collection(`plataforma_admin/billing/${collection}`).where('planId','==',planId).limit(1))));
 return snapshots.some(snapshot=>snapshot.size>0);
}
export async function deleteUnusedPlan(db,input,uid,now=Date.now()){
 if(typeof input.planId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(input.planId))throw new PlatformError(400,'Plano inválido.');
 const ref=db.doc(`plataforma_admin/billing/plans/${input.planId}`);
 return db.runTransaction(async tx=>{
  const plan=await tx.get(ref);
  if(!plan.exists)return {ok:true,alreadyDeleted:true};
  if(!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision!==Number(plan.data().updatedAt||0))throw new PlatformError(409,'O plano mudou em outra tela. Atualize a lista antes de excluir.');
  if(await planHasReferences(tx,db,input.planId))throw new PlatformError(409,'Este plano está vinculado a uma assinatura, pagamento, solicitação ou período contratado. Ele não foi excluído para preservar esses registros.');
  tx.delete(ref);
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'plan.delete_unused',planId:input.planId,name:plan.data().name,amountCents:plan.data().amountCents,interval:plan.data().interval,uid,at:now});
  return {ok:true};
 });
}
