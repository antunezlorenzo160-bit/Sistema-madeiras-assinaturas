import {createHash} from 'node:crypto';
import {normalizeInitialDebtV811} from '../../../public/initial-stock.mjs';
import {financeOwnerContext,financeCollectionPath} from './finance-access.mjs';
import {PlatformError} from './platform.mjs';
import {paymentTodayV757} from './purchase-payments.mjs';
export async function confirmInitialDebtV811(db,identity,input,now=Date.now()){
 let config;try{config=normalizeInitialDebtV811(input);}catch(e){throw new PlatformError(400,e.message);}
 if(config.date>paymentTodayV757(now))throw new PlatformError(400,'O saldo inicial da dívida não pode ter data futura.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(initial.empresaId!==config.companyId)throw new PlatformError(403,'A empresa mudou.');
 const signature=createHash('sha256').update(JSON.stringify(config)).digest('hex');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'A empresa mudou.');
  const ref=db.doc(financeCollectionPath(context.empresaId)+'/'+config.id),snap=await tx.get(ref);
  if(snap.exists){const old=snap.data();if(old.source?.type!=='opening-payable'||old.source.signature!==signature)throw new PlatformError(409,'Esta identificação já foi usada com outros valores.');return {...context,entry:old,repeated:true};}
  const entry={id:config.id,type:'purchase',date:config.date,partner:config.supplier,reference:config.reference,description:'Dívida anterior com fornecedor',category:'wood',amountCents:config.amountCents,costCents:null,status:'active',revision:1,settlement:{mode:'credit',dueDate:config.dueDate,payments:[]},source:{type:'opening-payable',signature},createdAt:now,createdBy:identity.uid,updatedAt:now,updatedBy:identity.uid};
  tx.create(ref,entry);tx.create(db.doc(ref.path+'/versoes/1'),{action:'opening-payable.confirm',at:now,by:identity.uid,previous:null,next:entry});return {...context,entry,repeated:false};
 });
}
