import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {paymentTodayV757} from './purchase-payments.mjs';
import {normalizeCashOpeningV759,normalizeCashMovementV759,projectCashBookV759} from '../../../public/cash-book.mjs';
export const cashCollectionV759=id=>financeCollectionPath(id)+'CaixaMovimentos';
export const cashOpeningPathV759=id=>financeCollectionPath(id)+'CaixaConfiguracao/inicio';
export async function readCashBook(db,identity,{from,to},now=Date.now()){
 try{projectCashBookV759({from,to});}catch(e){throw new PlatformError(400,e.message);}
 const result=await db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),false,now);
  const [config,manual,purchases,sales]=await Promise.all([tx.get(db.doc(cashOpeningPathV759(context.empresaId))),tx.get(db.collection(cashCollectionV759(context.empresaId)).where('date','<=',to).limit(2001)),tx.get(db.collection(financeCollectionPath(context.empresaId)).where('type','==','purchase').limit(1001)),tx.get(db.collection(financeCollectionPath(context.empresaId)+'VendasRecebimentos').limit(1001))]);
  if(sales.docs.length>1000||sales.docs.reduce((sum,d)=>sum+(d.data().settlement?.payments?.length||0),0)>10000||manual.docs.length>2000||purchases.docs.length>1000||purchases.docs.reduce((sum,d)=>sum+(d.data().settlement?.payments?.length||0),0)>10000)throw new PlatformError(409,'O histórico excede o limite desta conferência. Preserve os registros e solicite o arquivamento do caixa.');
  const opening=config.exists?{date:config.data().date,amountCents:config.data().amountCents,revision:config.data().revision}:null;
  let report;try{report=projectCashBookV759({opening,movements:manual.docs.map(d=>({...d.data(),id:d.id})),purchases:purchases.docs.map(d=>({...d.data(),id:d.id})),sales:sales.docs.map(d=>({...d.data(),id:d.id})),from,to});}catch(e){throw new PlatformError(409,e.message);}
  return {...context,report};
 });
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==result.empresaId)throw new PlatformError(409,'A empresa mudou.');return {...result,canWrite:latest.canWrite};
}
export async function saveCashBook(db,identity,input,now=Date.now()){
 if(!input||Object.keys(input).some(k=>!['companyId','action','entry'].includes(k))||!['opening','movement','cancel'].includes(input.action))throw new PlatformError(400,'Ação de caixa inválida.');
 let data;try{data=input.action==='opening'?normalizeCashOpeningV759(input.entry):input.action==='movement'?normalizeCashMovementV759(input.entry):input.entry;}catch(e){throw new PlatformError(400,e.message);}
 if(input.action==='cancel'&&(!data||Object.keys(data).some(k=>!['id','revision'].includes(k))||typeof data.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.id)||!Number.isSafeInteger(data.revision)||data.revision<1))throw new PlatformError(400,'Lançamento inválido.');
 if(data.date&&data.date>paymentTodayV757(now))throw new PlatformError(400,'O caixa registra dinheiro já movimentado. A data não pode ser futura.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(input.companyId!==initial.empresaId)throw new PlatformError(403,'A empresa mudou.');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'A empresa mudou.');
  const ref=db.doc(input.action==='opening'?cashOpeningPathV759(context.empresaId):cashCollectionV759(context.empresaId)+'/'+data.id),snap=await tx.get(ref),previous=snap.exists?snap.data():null;
  let next;
  if(input.action==='opening'){
   if((previous?.revision||0)!==data.revision){if(previous&&previous.revision===data.revision+1&&previous.date===data.date&&previous.amountCents===data.amountCents)return {...context,entry:previous,repeated:true};throw new PlatformError(409,'O saldo inicial mudou. Consulte o caixa antes de salvar.');}
   next={...data,revision:data.revision+1,createdAt:previous?.createdAt||now,createdBy:previous?.createdBy||identity.uid,updatedAt:now,updatedBy:identity.uid};
  }else if(input.action==='movement'){
   const signature=createHash('sha256').update(JSON.stringify(data)).digest('hex');
   if(previous){if(previous.signature!==signature)throw new PlatformError(409,'Este lançamento de caixa já existe com outros valores.');return {...context,entry:previous,repeated:true};}
   next={...data,signature,status:'active',revision:1,createdAt:now,createdBy:identity.uid,updatedAt:now,updatedBy:identity.uid};
  }else{
   if(!previous)throw new PlatformError(404,'Lançamento não encontrado.');
   if(previous.source?.type==='log-labour-payment')throw new PlatformError(409,'Recebimento vinculado ao serviço de toras. Confira o serviço; uma devolução deve ser registrada como saída efetiva.');
   if(previous.status==='cancelled'&&previous.revision===data.revision+1)return {...context,entry:previous,repeated:true};
   if(previous.status!=='active'||previous.revision!==data.revision)throw new PlatformError(409,'O lançamento mudou. Consulte o caixa.');
   next={...previous,status:'cancelled',revision:previous.revision+1,cancelledAt:now,cancelledBy:identity.uid,updatedAt:now,updatedBy:identity.uid};
  }
  if(input.action==='movement')tx.create(ref,next);else tx.set(ref,next);
  tx.create(db.doc(ref.path+'/versoes/'+next.revision),{action:'cash.'+input.action,at:now,by:identity.uid,previous:previous||null,next});return {...context,entry:next};
 });
}
