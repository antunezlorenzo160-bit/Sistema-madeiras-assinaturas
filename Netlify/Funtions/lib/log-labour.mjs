import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {cashCollectionV759} from './cash-book.mjs';
import {paymentNotFutureV757,paymentTodayV757} from './purchase-payments.mjs';
import {PlatformError} from './platform.mjs';
import {logLabourIdsV804,logLabourUuidV804,normalizeLogLabourRowsV804,normalizeLogLabourV804,logLabourPaidV804} from '../../../public/log-labour.mjs';
import {paymentDateV757} from '../../../public/purchase-payments.mjs';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const logLabourRecordsV804=company=>financeCollectionPath(company)+'ServicosToras';
const claimsPath=company=>financeCollectionPath(company)+'ServicosTorasLinhas';
const sourceRef=(db,company,id)=>db.doc(`empresas/${company}/dados/sm2_servicos/registros/cubagem_toras_linha_${id}`);
export function logLabourEntryIdV804(id,kind='entry'){const chars=digest(['log-labour',kind,id]).slice(0,32).split('');chars[12]='4';chars[16]='8';const s=chars.join('');return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);}
const invalid=error=>new PlatformError(400,error.message);
function companyCheck(input,company){if(input.companyId!==company)throw new PlatformError(403,'A empresa mudou. Reabra o serviço.');}
function cashEntry(receipt,payment,now,uid){return {id:logLabourEntryIdV804(receipt.id+':'+payment.id,'cash'),date:payment.date,direction:'in',category:'sale',amountCents:payment.amountCents,description:'Recebimento de mão de obra de toras',partner:receipt.client,reference:receipt.reference||'Serviço '+receipt.id,status:'active',revision:1,createdAt:now,createdBy:uid,updatedAt:now,updatedBy:uid,source:{type:'log-labour-payment',receiptId:receipt.id,paymentId:payment.id}};}
function createCash(tx,db,company,entry){tx.create(db.doc(cashCollectionV759(company)+'/'+entry.id),entry);tx.create(db.doc(cashCollectionV759(company)+'/'+entry.id+'/versoes/1'),{action:'log-labour.receive',at:entry.createdAt,by:entry.createdBy,previous:null,next:entry});}
export async function prepareLogLabourV804(db,identity,input,now=Date.now()){
 let ids;try{if(!input||Object.keys(input).some(k=>!['companyId','lineIds'].includes(k)))throw Error('Confira a lista de toras.');ids=logLabourIdsV804(input.lineIds);}catch(e){throw invalid(e);}
 const context=await financeOwnerContext(db,identity,undefined,false,now);companyCheck(input,context.empresaId);
 const rows=await Promise.all(ids.map(async id=>{const [line,claim]=await Promise.all([sourceRef(db,context.empresaId,id).get(),db.doc(claimsPath(context.empresaId)+'/'+id).get()]);return {id,line,claim};}));
 const available=[],claimed=[];for(const row of rows){if(row.claim.exists){claimed.push(row.id);continue;}if(!row.line.exists||row.line.data().ativo===false)throw new PlatformError(409,'Uma tora ainda não chegou ao servidor ou foi retirada. Aguarde a sincronização e confira novamente.');available.push({...row.line.data(),id:row.id});}
 let service=null;try{if(available.length)service=normalizeLogLabourRowsV804(available);}catch(e){throw invalid(e);}
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==context.empresaId)throw new PlatformError(409,'A empresa mudou.');return {...latest,service,claimed};
}
export async function confirmLogLabourV804(db,identity,input,now=Date.now()){
 let config;try{config=normalizeLogLabourV804(input);}catch(e){throw invalid(e);}paymentNotFutureV757(config.payment,now);
 const context=await financeOwnerContext(db,identity,undefined,true,now);companyCheck(config,context.empresaId);const signature=digest(config);
 return db.runTransaction(async tx=>{
  const current=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);companyCheck(config,current.empresaId);
  const ref=db.doc(logLabourRecordsV804(current.empresaId)+'/'+config.id),old=await tx.get(ref);
  if(old.exists){if(old.data().signature!==signature)throw new PlatformError(409,'Este serviço já foi registrado com outros dados.');return {...current,receipt:old.data(),repeated:true};}
  const entryId=logLabourEntryIdV804(config.id),entryRef=db.doc(financeCollectionPath(current.empresaId)+'/'+entryId),ledger=await tx.get(entryRef);
  if(ledger.exists)throw new PlatformError(409,'Já existe lançamento financeiro para este serviço.');
  const source=[];for(const line of config.lines){const row=await tx.get(sourceRef(db,current.empresaId,line.id)),claim=await tx.get(db.doc(claimsPath(current.empresaId)+'/'+line.id));if(claim.exists)throw new PlatformError(409,'Uma das toras já foi registrada em outro serviço. Confira a lista novamente.');if(!row.exists||row.data().ativo===false)throw new PlatformError(409,'A lista de toras mudou. Confira novamente.');source.push({...row.data(),id:line.id});}
  let authoritative;try{authoritative=normalizeLogLabourRowsV804(source);}catch(e){throw invalid(e);}
  if(digest(authoritative)!==digest({lines:config.lines,totalCents:config.totalCents,totalQuantity:config.totalQuantity,totalVolume:config.totalVolume}))throw new PlatformError(409,'As medidas, fórmula ou preço das toras mudaram. Confira a lista novamente.');
  const payments=config.payment.paidCents?[{id:config.id,date:config.payment.paidDate,amountCents:config.payment.paidCents,createdAt:now,createdBy:identity.uid}]:[];
  const receipt={...config,signature,entryId,payments,status:'active',revision:1,createdAt:now,createdBy:identity.uid,updatedAt:now,updatedBy:identity.uid};
  const cash=payments.length?cashEntry(receipt,payments[0],now,identity.uid):null;if(cash&&(await tx.get(db.doc(cashCollectionV759(current.empresaId)+'/'+cash.id))).exists)throw new PlatformError(409,'Já existe recebimento para este serviço.');
  const entry={id:entryId,type:'sale',date:config.date,description:config.description,partner:config.client,reference:config.reference||'Serviço '+config.id,category:'processing',amountCents:config.totalCents,costCents:0,status:'active',revision:1,createdAt:now,createdBy:identity.uid,updatedAt:now,updatedBy:identity.uid,source:{type:'log-labour',receiptId:config.id,serviceCents:config.totalCents,woodCents:0,receivedCents:logLabourPaidV804(receipt)}};
  tx.create(ref,receipt);tx.create(entryRef,entry);tx.create(db.doc(entryRef.path+'/versoes/1'),{action:'log-labour.confirm',at:now,by:identity.uid,previous:null,next:entry});
  for(const line of config.lines)tx.create(db.doc(claimsPath(current.empresaId)+'/'+line.id),{receiptId:config.id,createdAt:now,createdBy:identity.uid});
  if(cash)createCash(tx,db,current.empresaId,cash);return {...current,receipt,repeated:false};
 });
}
export async function receiveLogLabourV804(db,identity,input,now=Date.now()){
 if(!input||Object.keys(input).some(k=>!['companyId','id','revision','paymentId','date','amountCents'].includes(k))||!logLabourUuidV804(input.id)||!logLabourUuidV804(input.paymentId)||!Number.isSafeInteger(input.revision)||input.revision<1||!paymentDateV757(input.date)||input.date>paymentTodayV757(now)||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0)throw new PlatformError(400,'Confira a identificação, data e valor recebido.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);companyCheck(input,initial.empresaId);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);companyCheck(input,context.empresaId);
  const ref=db.doc(logLabourRecordsV804(context.empresaId)+'/'+input.id),snap=await tx.get(ref),old=snap.exists?snap.data():null;if(!old)throw new PlatformError(404,'Serviço não encontrado.');
  const previous=(old.payments||[]).find(p=>p.id===input.paymentId);if(previous){if(previous.amountCents!==input.amountCents||previous.date!==input.date)throw new PlatformError(409,'Este recebimento já tem outros dados.');return {...context,receipt:old,repeated:true};}
  if(old.status!=='active'||old.revision!==input.revision||input.date<old.date||old.payments.length>=200||input.amountCents>old.totalCents-logLabourPaidV804(old))throw new PlatformError(409,'Confira o saldo e atualize o histórico antes de receber.');
  const entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+old.entryId),entrySnap=await tx.get(entryRef),entry=entrySnap.exists?entrySnap.data():null;
  if(entry?.source?.type!=='log-labour'||entry.status!=='active'||entry.amountCents!==old.totalCents)throw new PlatformError(409,'O financeiro do serviço precisa de conferência.');
  const payment={id:input.paymentId,date:input.date,amountCents:input.amountCents,createdAt:now,createdBy:identity.uid},cash=cashEntry(old,payment,now,identity.uid);
  if((await tx.get(db.doc(cashCollectionV759(context.empresaId)+'/'+cash.id))).exists)throw new PlatformError(409,'Este recebimento já está no caixa.');
  const receipt={...old,payments:[...old.payments,payment],revision:old.revision+1,updatedAt:now,updatedBy:identity.uid},next={...entry,revision:entry.revision+1,updatedAt:now,updatedBy:identity.uid,source:{...entry.source,receivedCents:logLabourPaidV804(receipt)}};
  tx.set(ref,receipt);tx.set(entryRef,next);tx.create(db.doc(entryRef.path+'/versoes/'+next.revision),{action:'log-labour.receive',at:now,by:identity.uid,previous:entry,next});createCash(tx,db,context.empresaId,cash);return {...context,receipt};
 });
}
export async function cancelLogLabourV804(db,identity,input,now=Date.now()){
 if(!input||Object.keys(input).some(k=>!['companyId','id','revision'].includes(k))||!logLabourUuidV804(input.id)||!Number.isSafeInteger(input.revision)||input.revision<1)throw new PlatformError(400,'Serviço inválido.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);companyCheck(input,initial.empresaId);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);companyCheck(input,context.empresaId);const ref=db.doc(logLabourRecordsV804(context.empresaId)+'/'+input.id),snap=await tx.get(ref),old=snap.exists?snap.data():null;
  if(!old)throw new PlatformError(404,'Serviço não encontrado.');if(old.status==='cancelled'&&old.revision===input.revision+1)return {...context,receipt:old,repeated:true};
  if(old.status!=='active'||old.revision!==input.revision)throw new PlatformError(409,'Serviço alterado. Consulte o histórico.');
  const entryRef=db.doc(financeCollectionPath(context.empresaId)+'/'+old.entryId),entrySnap=await tx.get(entryRef),entry=entrySnap.exists?entrySnap.data():null;
  if(entry?.source?.type!=='log-labour'||entry.status!=='active'||entry.amountCents!==old.totalCents)throw new PlatformError(409,'O financeiro do serviço precisa de conferência.');
  const receipt={...old,status:'cancelled',revision:old.revision+1,updatedAt:now,updatedBy:identity.uid,cancelledAt:now,cancelledBy:identity.uid},next={...entry,status:'cancelled',revision:entry.revision+1,updatedAt:now,updatedBy:identity.uid};
  tx.set(ref,receipt);tx.set(entryRef,next);tx.create(db.doc(entryRef.path+'/versoes/'+next.revision),{action:'log-labour.cancel',at:now,by:identity.uid,previous:entry,next});return {...context,receipt};
 });
}
export async function listLogLabourV804(db,identity,{from,to},now=Date.now()){
 if(!paymentDateV757(from)||!paymentDateV757(to)||from>to)throw new PlatformError(400,'Confira o período.');const context=await financeOwnerContext(db,identity,undefined,false,now);
 const snap=await db.collection(logLabourRecordsV804(context.empresaId)).where('date','>=',from).where('date','<=',to).orderBy('date','desc').limit(101).get();if(snap.docs.length>100)throw new PlatformError(409,'Mais de 100 serviços. Consulte um período menor.');
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==context.empresaId)throw new PlatformError(409,'A empresa mudou.');return {...latest,receipts:snap.docs.map(d=>({...d.data(),id:d.id}))};
}
