import {projectSharedTripExpenses} from './shared-trips.mjs';
import {readOpeningStockCost} from './opening-stock-cost.mjs';
import {readMinimumProfitPolicy} from './minimum-profit.mjs';
import {reviewLoadSaleDuplicates} from '../../../public/load-sales.mjs';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {projectLoadSales} from './load-sales.mjs';
import {FINANCE_PREVIEW} from './finance-context.mjs';
import {PlatformError} from './platform.mjs';
import {normalizeFinanceEntry} from '../../../public/company-finance.mjs';
import {stockChartDate} from '../../../public/stock-charts.mjs';
export {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
export async function listFinanceEntries(db,identity,{from,to},now=Date.now()){
 if(typeof from!=='string'||typeof to!=='string'||stockChartDate(from)!==from||stockChartDate(to)!==to||from>to)throw new PlatformError(400,'Confira o período de consulta.');
 const context=await financeOwnerContext(db,identity,undefined,false,now);
 const snapshot=await db.collection(financeCollectionPath(context.empresaId)).where('date','>=',from).where('date','<=',to).orderBy('date','desc').limit(1001).get();
 if(snapshot.docs.length>1000)throw new PlatformError(409,'Há mais de 1.000 registros. Selecione um período menor para conferir todos os valores.');
 const manual=await projectSharedTripExpenses(db,context.empresaId,snapshot.docs.map(doc=>({...doc.data(),id:doc.id})));
 const [openingPolicy,profitPolicy]=await Promise.all([readOpeningStockCost(db,context.empresaId),readMinimumProfitPolicy(db,context.empresaId)]);
 const automatic=await projectLoadSales(db,context.empresaId,{from,to},openingPolicy);
 if(automatic.some(sale=>manual.some(entry=>entry.id===sale.id)))throw new PlatformError(409,'Há um conflito na identificação de uma venda. Consulte o suporte.');
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==context.empresaId)throw new PlatformError(409,'O vínculo da conta mudou. Entre novamente.');
 return {...latest,preview:FINANCE_PREVIEW,profitPolicy,openingPolicy,entries:reviewLoadSaleDuplicates([...manual,...automatic]).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt-a.updatedAt)};
}
export async function saveFinanceEntry(db,identity,input,now=Date.now()){
 let entry;try{entry=normalizeFinanceEntry(input);}catch(e){throw new PlatformError(400,e.message);}
 const initial=await financeOwnerContext(db,identity,undefined,true,now);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo da conta mudou. Entre novamente.');
  const ref=db.doc(financeCollectionPath(context.empresaId)+'/'+entry.id),snapshot=await tx.get(ref),previous=snapshot.exists?snapshot.data():null;
  if(previous?.settlement)throw new PlatformError(409,'Esta compra tem pagamentos registrados. Confira em Pagamentos de compras antes de alterar seus valores.');
  if(previous?.source?.type==='shared-trip')throw new PlatformError(409,'Altere estes gastos na viagem compartilhada.');
  if(previous?.source?.type==='log-purchase')throw new PlatformError(409,'Altere ou cancele esta compra na aba Toras.');
  if(previous?.source?.type==='stock-purchase')throw new PlatformError(409,'Compra vinculada ao descarregamento. O registro é preservado para conferir estoque e custo.');
  if(previous?.source?.type==='load-transport')throw new PlatformError(409,'Altere estes gastos em Gastos do transporte, no carregamento.');
  if(previous?.status==='cancelled')throw new PlatformError(409,'Este registro foi cancelado. Crie um novo lançamento.');
  if((previous?.revision||0)!==entry.revision){
   const same=previous&&previous.revision===entry.revision+1&&Object.keys(entry).filter(k=>k!=='revision').every(k=>previous[k]===entry[k]);
   if(same)return {empresaId:context.empresaId,entry:previous};
   throw new PlatformError(409,'Este registro mudou em outro aparelho. Atualize a lista antes de salvar.');
  }
  if(!previous&&entry.revision!==0)throw new PlatformError(409,'Registro não encontrado. Atualize a lista.');
  const saved={...entry,status:'active',revision:entry.revision+1,createdAt:previous?.createdAt||now,createdBy:previous?.createdBy||identity.uid,updatedAt:now,updatedBy:identity.uid};
  tx.set(ref,saved);tx.create(db.doc(ref.path+'/versoes/'+saved.revision),{action:previous?'update':'create',at:now,by:identity.uid,previous:previous||null,next:saved});
  return {empresaId:context.empresaId,entry:saved};
 });
}
export async function cancelFinanceEntry(db,identity,input,now=Date.now()){
 if(typeof input?.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<1)throw new PlatformError(400,'Registro inválido.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo da conta mudou. Entre novamente.');
  const ref=db.doc(financeCollectionPath(context.empresaId)+'/'+input.id),snapshot=await tx.get(ref),previous=snapshot.exists?snapshot.data():null;
  if(!previous)throw new PlatformError(404,'Registro não encontrado.');
  if(previous.source?.type==='shared-trip')throw new PlatformError(409,'Altere estes gastos na viagem compartilhada.');
  if(previous.source?.type==='log-purchase')throw new PlatformError(409,'Cancele a compra na aba Toras para manter o histórico e o financeiro juntos.');
  if(previous.source?.type==='stock-purchase')throw new PlatformError(409,'Compra vinculada ao descarregamento. Não cancele apenas o financeiro sem conferir o estoque.');
  if(previous.source?.type==='load-transport')throw new PlatformError(409,'Altere estes gastos em Gastos do transporte, no carregamento.');
  if(previous.status==='cancelled'&&previous.revision===input.revision+1)return {empresaId:context.empresaId,entry:previous};
  if(previous.status!=='active'||previous.revision!==input.revision)throw new PlatformError(409,'Registro alterado. Atualize a lista.');
  const entry={...previous,status:'cancelled',revision:previous.revision+1,updatedAt:now,updatedBy:identity.uid,cancelledAt:now,cancelledBy:identity.uid};
  tx.set(ref,entry);tx.create(db.doc(ref.path+'/versoes/'+entry.revision),{action:'cancel',at:now,by:identity.uid,previous,next:entry});return {empresaId:context.empresaId,entry};
 });
}
