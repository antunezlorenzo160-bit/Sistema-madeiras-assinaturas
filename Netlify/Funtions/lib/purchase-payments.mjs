import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {normalizePurchasePaymentV757,purchaseSettlementV757,purchasePaidCentsV757,purchaseAccountsV757,paymentDateV757} from '../../../public/purchase-payments.mjs';
export function paymentTodayV757(now){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now)),d=Object.fromEntries(parts.map(p=>[p.type,p.value]));return d.year+'-'+d.month+'-'+d.day;}
export function paymentNotFutureV757(payment,now){if(payment?.paidDate&&payment.paidDate>paymentTodayV757(now))throw new PlatformError(400,'O pagamento realizado não pode ter data futura.');}
export async function listPurchaseAccounts(db,identity,range,now=Date.now()){
 try{purchaseAccountsV757([],range);}catch(e){throw new PlatformError(400,e.message);}
 const context=await financeOwnerContext(db,identity,undefined,false,now),snap=await db.collection(financeCollectionPath(context.empresaId)).where('type','==','purchase').limit(1001).get();
 if(snap.docs.reduce((sum,d)=>sum+(d.data().settlement?.payments?.length||0),0)>10000)throw new PlatformError(409,'Há mais de 10.000 pagamentos nesta conferência. Consulte o suporte para arquivar o histórico.');
 if(snap.docs.length>1000)throw new PlatformError(409,'Mais de 1.000 compras: a conferência de contas precisa de um período de arquivo antes de continuar.');
 let report;try{report=purchaseAccountsV757(snap.docs.map(d=>({...d.data(),id:d.id})),range);}catch(e){throw new PlatformError(409,e.message);}
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==context.empresaId)throw new PlatformError(409,'A empresa mudou.');return {...context,report};
}
export async function savePurchasePayment(db,identity,input,now=Date.now()){
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(!input||Object.keys(input).some(k=>!['companyId','entryId','revision','operationId','action','date','amountCents','paymentId','payment','dueDate'].includes(k))||!uuid.test(input.entryId||'')||!uuid.test(input.operationId||'')||!Number.isSafeInteger(input.revision)||input.revision<1||!['initialize','pay','void','due'].includes(input.action))throw new PlatformError(400,'Pagamento inválido.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(input.companyId!==initial.empresaId)throw new PlatformError(403,'A empresa mudou.');
 const signature=createHash('sha256').update(JSON.stringify(input)).digest('hex');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'A empresa mudou.');
  const entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+input.entryId),opRef=db.doc(financeCollectionPath(context.empresaId)+'PagamentosOperacoes/'+input.operationId),[entrySnap,opSnap]=await Promise.all([tx.get(entryRef),tx.get(opRef)]),entry=entrySnap.exists?entrySnap.data():null,operation=opSnap.exists?opSnap.data():null;
  if(operation){if(operation.signature!==signature)throw new PlatformError(409,'Esta tentativa de pagamento já foi usada com outros valores.');return {...context,entry,repeated:true};}
  if(!entry||entry.type!=='purchase')throw new PlatformError(404,'Compra não encontrada.');
  if(entry.revision!==input.revision)throw new PlatformError(409,'A compra mudou. Atualize as contas antes de registrar o pagamento.');
  let settlement=entry.settlement?structuredClone(entry.settlement):null;
  try{
   if(input.action==='initialize'){
    if(entry.status!=='active'||settlement)throw Error('Condição já informada ou compra cancelada.');const payment=normalizePurchasePaymentV757(input.payment,entry.amountCents,entry.date);paymentNotFutureV757(payment,now);settlement=purchaseSettlementV757({id:entry.id,date:entry.date,totalCents:entry.amountCents,payment},now,identity.uid,input.operationId);
   }else{
    if(!settlement)throw Error('Informe primeiro a condição de pagamento desta compra.');
    if(input.action==='pay'){
     if(entry.status!=='active'||!paymentDateV757(input.date)||input.date<entry.date||input.date>paymentTodayV757(now)||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||input.amountCents>entry.amountCents-purchasePaidCentsV757(entry))throw Error('Confira data e valor: o pagamento não pode ultrapassar o restante da compra.');
     if(settlement.payments.some(p=>p.id===input.operationId))throw Error('Identificação de pagamento já utilizada.');
     if(settlement.payments.length>=200)throw Error('Esta compra atingiu 200 lançamentos de pagamento.');
     settlement.payments.push({id:input.operationId,date:input.date,amountCents:input.amountCents,createdAt:now,createdBy:identity.uid});
    }else if(input.action==='void'){
     const payment=settlement.payments.find(p=>p.id===input.paymentId);if(!payment||payment.voidedAt)throw Error('Pagamento não encontrado ou já anulado.');payment.voidedAt=now;payment.voidedBy=identity.uid;
    }else{
     if(entry.status!=='active'||!paymentDateV757(input.dueDate)||input.dueDate<entry.date)throw Error('Confira o vencimento.');settlement.dueDate=input.dueDate;
    }
   }
  }catch(e){if(e instanceof PlatformError)throw e;throw new PlatformError(400,e.message);}
  const next={...entry,settlement,revision:entry.revision+1,updatedAt:now,updatedBy:identity.uid};
  tx.set(entryRef,next);tx.create(opRef,{signature,entryId:entry.id,action:input.action,at:now,by:identity.uid});tx.create(db.doc(entryRef.path+'/versoes/'+next.revision),{action:'purchase-payment.'+input.action,at:now,by:identity.uid,previous:entry,next});return {...context,entry:next};
 });
}
