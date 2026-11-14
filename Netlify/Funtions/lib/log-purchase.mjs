import {purchaseSettlementV757} from '../../../public/purchase-payments.mjs';
import {paymentNotFutureV757} from './purchase-payments.mjs';
import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {normalizeLogPurchaseV756} from '../../../public/log-purchase.mjs';
export const logPurchaseRecordsPath=id=>financeCollectionPath(id)+'ComprasToras';
export function logPurchaseEntryId(id){const hex=createHash('sha256').update('log-purchase:'+id).digest('hex').slice(0,32).split('');hex[12]='4';hex[16]='8';const s=hex.join('');return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);}
export async function confirmLogPurchase(db,identity,input,now=Date.now()){
 let config;try{config=normalizeLogPurchaseV756(input);}catch(e){throw new PlatformError(400,e.message);}
 paymentNotFutureV757(config.payment,now);
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(config.companyId!==initial.empresaId)throw new PlatformError(403,'A empresa mudou. Reabra a compra.');
 const signature=createHash('sha256').update(JSON.stringify(config)).digest('hex');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo da empresa mudou.');
  const receiptRef=db.doc(logPurchaseRecordsPath(context.empresaId)+'/'+config.id),snap=await tx.get(receiptRef),previous=snap.exists?snap.data():null;
  if(previous){if(previous.signature!==signature)throw new PlatformError(409,'Esta compra de toras já foi confirmada com outros valores.');return {receipt:previous,repeated:true};}
  const entryId=logPurchaseEntryId(config.id),entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+entryId),entrySnap=await tx.get(entryRef);if(entrySnap.exists)throw new PlatformError(409,'A compra já tem um registro financeiro. Atualize o histórico.');
  const receipt={...config,signature,entryId,status:'active',revision:1,createdAt:now,createdBy:identity.uid,updatedAt:now,updatedBy:identity.uid};
  const entry={id:entryId,revision:1,type:'purchase',date:config.date,description:'Compra de toras — '+config.totalQuantity+' tora(s)',partner:config.supplier,reference:config.reference||'Toras '+config.id,category:'wood',amountCents:config.totalCents,costCents:null,...(config.payment?{settlement:purchaseSettlementV757(config,now,identity.uid)}:{}),status:'active',createdAt:now,createdBy:identity.uid,updatedAt:now,updatedBy:identity.uid,source:{type:'log-purchase',receiptId:config.id,goodsCents:config.goodsCents,acquisitionExpensesCents:config.addedCents,totalVolume:config.totalVolume}};
  tx.create(receiptRef,receipt);tx.create(entryRef,entry);tx.create(db.doc(entryRef.path+'/versoes/1'),{action:'log-purchase.confirm',at:now,by:identity.uid,previous:null,next:entry});
  return {receipt,repeated:false};
 });
}
export async function cancelLogPurchase(db,identity,input,now=Date.now()){
 if(!input||Object.keys(input).some(k=>!['companyId','id','revision'].includes(k))||typeof input.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<1)throw new PlatformError(400,'Compra inválida.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(input.companyId!==initial.empresaId)throw new PlatformError(403,'A empresa mudou.');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'O vínculo da empresa mudou.');
  const receiptRef=db.doc(logPurchaseRecordsPath(context.empresaId)+'/'+input.id),snap=await tx.get(receiptRef),old=snap.exists?snap.data():null;if(!old)throw new PlatformError(404,'Compra não encontrada.');
  if(old.status==='cancelled'&&old.revision===input.revision+1)return {receipt:old,repeated:true};
  if(old.status!=='active'||old.revision!==input.revision)throw new PlatformError(409,'Compra alterada. Atualize o histórico.');
  const entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+old.entryId),entrySnap=await tx.get(entryRef),entry=entrySnap.exists?entrySnap.data():null;
  if(entry?.source?.type!=='log-purchase'||entry.source.receiptId!==input.id||entry.status!=='active'||entry.amountCents!==old.totalCents)throw new PlatformError(409,'O financeiro desta compra precisa de conferência.');
  const receipt={...old,status:'cancelled',revision:old.revision+1,cancelledAt:now,cancelledBy:identity.uid,updatedAt:now,updatedBy:identity.uid},next={...entry,status:'cancelled',revision:entry.revision+1,cancelledAt:now,cancelledBy:identity.uid,updatedAt:now,updatedBy:identity.uid};
  tx.set(receiptRef,receipt);tx.set(entryRef,next);tx.create(db.doc(entryRef.path+'/versoes/'+next.revision),{action:'log-purchase.cancel',at:now,by:identity.uid,previous:entry,next});return {receipt};
 });
}
export async function listLogPurchases(db,identity,{from,to},now=Date.now()){
 const valid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
 if(!valid(from)||!valid(to)||from>to)throw new PlatformError(400,'Confira o período.');
 const context=await financeOwnerContext(db,identity,undefined,false,now),snap=await db.collection(logPurchaseRecordsPath(context.empresaId)).where('date','>=',from).where('date','<=',to).orderBy('date','desc').limit(101).get();
 if(snap.docs.length>100)throw new PlatformError(409,'Mais de 100 compras. Consulte um período menor.');
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==context.empresaId)throw new PlatformError(409,'A empresa mudou.');
 return {empresaId:context.empresaId,canWrite:context.canWrite,receipts:snap.docs.map(d=>({...d.data(),id:d.id}))};
}
