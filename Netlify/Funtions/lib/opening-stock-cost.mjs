import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {normalizeOpeningStockCost} from '../../../public/opening-stock-cost.mjs';
export const openingStockCostPath=id=>financeCollectionPath(id)+'CustoEstoqueAntigo/geral';
export async function readOpeningStockCost(db,empresaId){const snap=await db.doc(openingStockCostPath(empresaId)).get();return normalizeOpeningStockCost(snap.exists?snap.data():{});}
export async function saveOpeningStockCost(db,identity,input,now=Date.now()){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['companyId','unitCents','revision'].includes(k))||typeof input.companyId!=='string'||!/^[-\w]{1,120}$/.test(input.companyId)||!Object.hasOwn(input,'unitCents')||!Object.hasOwn(input,'revision'))throw new PlatformError(400,'Dados do custo antigo inválidos.');
 let request;try{request=normalizeOpeningStockCost({unitCents:input.unitCents,revision:input.revision,cutoffAt:input.revision>0?now:null});}catch(e){throw new PlatformError(400,e.message);}
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(initial.empresaId!==input.companyId)throw new PlatformError(403,'A empresa da tela mudou. Reabra o sistema.');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,ref=>tx.get(ref),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo mudou. Entre novamente.');
  const ref=db.doc(openingStockCostPath(context.empresaId)),snap=await tx.get(ref),old=snap.exists?snap.data():null,previous=normalizeOpeningStockCost(old||{});
  if(previous.revision!==request.revision){if(previous.revision===request.revision+1&&previous.unitCents===request.unitCents)return {empresaId:context.empresaId,policy:previous};throw new PlatformError(409,'O custo antigo mudou em outro aparelho. Consulte o período novamente.');}
  const policy={unitCents:request.unitCents,cutoffAt:previous.cutoffAt||now,revision:previous.revision+1},saved={...policy,updatedAt:now,updatedBy:identity.uid};
  tx.set(ref,saved);tx.create(db.doc(ref.path+'/versoes/'+policy.revision),{action:'opening-stock-cost',at:now,by:identity.uid,previous:old,next:saved});
  return {empresaId:context.empresaId,policy};
 });
}
