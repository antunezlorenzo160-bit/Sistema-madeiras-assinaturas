import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {normalizeMinimumProfitPolicy} from '../../../public/minimum-profit.mjs';
import {PlatformError} from './platform.mjs';
export const minimumProfitPolicyPath=empresaId=>financeCollectionPath(empresaId)+'MargemMinima/geral';
export async function readMinimumProfitPolicy(db,empresaId){const snapshot=await db.doc(minimumProfitPolicyPath(empresaId)).get();return normalizeMinimumProfitPolicy(snapshot.exists?snapshot.data():{});}
export async function saveMinimumProfitPolicy(db,identity,input,now=Date.now()){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(input,'minimumBasisPoints')||!Object.hasOwn(input,'revision')||Object.keys(input).some(key=>!['minimumBasisPoints','revision'].includes(key)))throw new PlatformError(400,'Configuração inválida.');
 let request;try{request=normalizeMinimumProfitPolicy(input);}catch(e){throw new PlatformError(400,e.message);}
 const initial=await financeOwnerContext(db,identity,undefined,true,now);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,ref=>tx.get(ref),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo mudou. Entre novamente.');
  const ref=db.doc(minimumProfitPolicyPath(context.empresaId)),snapshot=await tx.get(ref),old=snapshot.exists?snapshot.data():null,previous=normalizeMinimumProfitPolicy(old||{});
  if(previous.revision!==request.revision){if(previous.revision===request.revision+1&&previous.minimumBasisPoints===request.minimumBasisPoints)return {empresaId:context.empresaId,policy:previous};throw new PlatformError(409,'O mínimo mudou em outro aparelho. Consulte o período novamente antes de salvar.');}
  const policy={...request,revision:request.revision+1},saved={...policy,updatedAt:now,updatedBy:identity.uid};tx.set(ref,saved);tx.create(db.doc(ref.path+'/versoes/'+policy.revision),{at:now,by:identity.uid,previous:old||null,next:saved});return {empresaId:context.empresaId,policy};
 });
}
