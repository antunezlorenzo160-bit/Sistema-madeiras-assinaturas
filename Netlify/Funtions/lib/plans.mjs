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
