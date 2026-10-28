import {randomUUID} from 'node:crypto';
import {PlatformError} from './platform.mjs';
const root='plataforma_admin/billing';
export async function removePlanDuplicates(db,planId,uid,now=Date.now()){
 if(typeof planId!=='string'||!/^[-A-Za-z0-9_]{1,120}$/.test(planId))throw new PlatformError(400,'Plano inválido.');
 return db.runTransaction(async tx=>{
  const plans=await tx.get(db.collection(`${root}/plans`).limit(201));
  if(plans.size>200)throw new PlatformError(409,'A lista de planos exige uma revisão maior.');
  const target=plans.docs.find(p=>p.id===planId);
  if(!target)throw new PlatformError(404,'Plano não encontrado.');
  const same=p=>{const a=p.data(),b=target.data();return a.name===b.name&&a.amountCents===b.amountCents&&a.interval===b.interval;};
  const duplicates=plans.docs.filter(same);
  if(duplicates.length<2)return {ok:true,removed:0};
  const checked=await Promise.all(duplicates.map(async plan=>{
   const [subscriptions,charges]=await Promise.all([
    tx.get(db.collection(`${root}/subscriptions`).where('planId','==',plan.id).limit(1)),
    tx.get(db.collection(`${root}/charges`).where('planId','==',plan.id).limit(1))
   ]);
   return {plan,used:subscriptions.size>0||charges.size>0};
  }));
  checked.sort((a,b)=>Number(b.used)-Number(a.used)||Number(a.plan.data().updatedAt||0)-Number(b.plan.data().updatedAt||0)||a.plan.id.localeCompare(b.plan.id));
  const removable=checked.slice(1).filter(p=>!p.used);
  if(!removable.length)throw new PlatformError(409,'Os planos iguais têm vínculos com assinaturas ou pagamentos. Nenhum foi excluído.');
  for(const {plan} of removable)tx.delete(plan.ref);
  tx.create(db.doc(`plataforma_admin/audit/events/${randomUUID()}`),{action:'plan.remove_duplicates',uid,at:now,keptPlanId:checked[0].plan.id,removedPlanIds:removable.map(p=>p.plan.id)});
  return {ok:true,removed:removable.length};
 });
}
