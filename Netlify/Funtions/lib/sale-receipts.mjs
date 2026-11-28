import {createHash} from 'node:crypto';
import {financeCollectionPath,financeOwnerContext} from './finance-access.mjs';
import {listFinanceEntries} from './company-finance.mjs';
import {describeLoadSale,loadSaleKeys} from './load-sales.mjs';
import {PlatformError} from './platform.mjs';
import {paymentTodayV757} from './purchase-payments.mjs';
import {paymentDateV757} from '../../../public/purchase-payments.mjs';
import {normalizeSaleReceiptV807,saleSettlementV807,saleReceivedCentsV807,saleAccountsV807} from '../../../public/sale-receipts.mjs';
export const saleReceiptPathV807=id=>financeCollectionPath(id)+'VendasRecebimentos';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const saleReceiptSignatureV807=entry=>hash([entry.id,entry.date,entry.amountCents,entry.source?.signature||null]);
export async function listSaleReceipts(db,identity,range,now=Date.now()){
 const result=await listFinanceEntries(db,identity,range,now),sales=result.entries.filter(e=>e.type==='sale'&&e.source?.type!=='log-labour');
 const rows=await Promise.all(sales.map(async e=>{const saved=await db.doc(saleReceiptPathV807(result.empresaId)+'/'+e.id).get(),receipt=saved.exists?saved.data():null;return {...e,revision:receipt?.revision||0,settlement:receipt?.settlement||null,receiptSignature:saleReceiptSignatureV807(e),receiptChanged:!!receipt&&receipt.signature!==saleReceiptSignatureV807(e)};}));
 const latest=await financeOwnerContext(db,identity,undefined,false,now);if(latest.empresaId!==result.empresaId)throw new PlatformError(409,'A empresa mudou.');
 return {...latest,report:saleAccountsV807(rows,range)};
}
export async function saveSaleReceipt(db,identity,input,now=Date.now(),promissoria=null){
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(!input||Object.keys(input).some(k=>!['companyId','entryId','revision','operationId','action','date','amountCents','paymentId','payment','dueDate','saleDate','loadId','signature','acknowledged'].includes(k))||!uuid.test(input.entryId||'')||!uuid.test(input.operationId||'')||!Number.isSafeInteger(input.revision)||input.revision<0||!['initialize','pay','void','due',...(promissoria?['promissoria']:[])].includes(input.action)||!paymentDateV757(input.saleDate)||typeof input.signature!=='string'||!/^[a-f0-9]{64}$/.test(input.signature)||input.loadId!=null&&!/^[-\w]{1,120}$/.test(input.loadId)||input.acknowledged!==true)throw new PlatformError(400,'Confira a venda e confirme que este recebimento ainda não foi lançado no caixa.');
 const initial=await financeOwnerContext(db,identity,undefined,true,now);if(input.companyId!==initial.empresaId)throw new PlatformError(403,'A empresa mudou.');
 // Apply the same duplicate-sale review as the financial report before allowing receipts.
 const view=await listFinanceEntries(db,identity,{from:input.saleDate,to:input.saleDate},now),visible=view.entries.find(e=>e.id===input.entryId);
 if(!visible||visible.type!=='sale'||visible.source?.type==='log-labour')throw new PlatformError(409,'Venda não encontrada. Consulte as vendas novamente.');
 const operationSignature=hash(input);
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,r=>tx.get(r),true,now);if(context.empresaId!==initial.empresaId)throw new PlatformError(409,'A empresa mudou.');
  const ref=db.doc(saleReceiptPathV807(context.empresaId)+'/'+input.entryId),opRef=db.doc(saleReceiptPathV807(context.empresaId)+'Operacoes/'+input.operationId),[oldSnap,opSnap]=await Promise.all([tx.get(ref),tx.get(opRef)]),old=oldSnap.exists?oldSnap.data():null;
  if(opSnap.exists){if(opSnap.data().signature!==operationSignature)throw new PlatformError(409,'Esta tentativa já foi usada com outros valores.');return {...context,entry:old,repeated:true};}
  if(visible.status!=='active'&&input.action!=='void')throw new PlatformError(409,'Esta venda não está ativa ou aguarda conferir duplicidade.');
  let sale;
  if(input.loadId){
   if(loadSaleKeys(input.loadId).entryId!==input.entryId)throw new PlatformError(400,'Identificação da carga inválida.');
   sale=await saleForReceipt(db,context.empresaId,input.loadId,r=>tx.get(r));
  }else{const snap=await tx.get(db.doc(financeCollectionPath(context.empresaId)+'/'+input.entryId));sale=snap.exists?{...snap.data(),id:snap.id}:null;}
  if(!sale||sale.type!=='sale'||sale.source?.type==='log-labour'||sale.date!==input.saleDate||saleReceiptSignatureV807(sale)!==input.signature||old&&old.signature!==input.signature||sale.status!=='active'&&input.action!=='void')throw new PlatformError(409,'A venda mudou. Confira os valores antes de registrar recebimentos.');
  if((old?.revision||0)!==input.revision)throw new PlatformError(409,'Os recebimentos mudaram. Consulte novamente.');
  let settlement=old?.settlement?structuredClone(old.settlement):null;
  try{
   if(input.action==='initialize'){
    if(settlement)throw Error('Condição já informada.');const payment=normalizeSaleReceiptV807(input.payment,sale.amountCents,sale.date);
    if(payment.paidDate&&payment.paidDate>paymentTodayV757(now))throw Error('Recebimento não pode ter data futura.');
    settlement=saleSettlementV807({id:sale.id,date:sale.date,totalCents:sale.amountCents,payment},now,identity.uid,input.operationId);
   }else{
    if(!settlement&&promissoria)settlement={mode:'credit',dueDate:promissoria.dueDate<sale.date?sale.date:promissoria.dueDate,payments:[]};
    if(!settlement)throw Error('Informe primeiro a condição de recebimento.');
    if(input.action==='pay'||input.action==='promissoria'){
     if(!paymentDateV757(input.date)||input.date<sale.date||input.date>paymentTodayV757(now)||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||input.amountCents>sale.amountCents-saleReceivedCentsV807({...sale,settlement}))throw Error('Confira data e valor: o recebimento não pode ultrapassar o restante da venda.');
     if(settlement.payments.length>=200)throw Error('Venda atingiu 200 recebimentos.');settlement.payments.push({id:input.operationId,date:input.date,amountCents:input.amountCents,createdAt:now,createdBy:identity.uid,...(promissoria?{source:{type:'promissoria',parcela:promissoria.numero}}:{})});
    }else if(input.action==='void'){
     const payment=settlement.payments.find(p=>p.id===input.paymentId);if(!payment||payment.voidedAt)throw Error('Recebimento não encontrado ou já anulado.');payment.voidedAt=now;payment.voidedBy=identity.uid;
    }else{if(!paymentDateV757(input.dueDate)||input.dueDate<sale.date)throw Error('Confira o vencimento.');settlement.dueDate=input.dueDate;}
   }
   saleReceivedCentsV807({...sale,settlement});
  }catch(e){throw new PlatformError(400,e.message);}
  const next={id:sale.id,type:'sale',date:sale.date,description:sale.description,partner:sale.partner||'',reference:sale.reference||'',amountCents:sale.amountCents,signature:input.signature,loadId:input.loadId||null,settlement,status:'active',revision:input.revision+1,createdAt:old?.createdAt||now,createdBy:old?.createdBy||identity.uid,updatedAt:now,updatedBy:identity.uid};
  tx.set(ref,next);tx.create(opRef,{signature:operationSignature,entryId:sale.id,at:now,by:identity.uid});tx.create(db.doc(ref.path+'/versoes/'+next.revision),{action:'sale-receipt.'+input.action,at:now,by:identity.uid,previous:old,next});return {...context,entry:next};
 });
}

async function saleForReceipt(db,empresaId,loadId,read=ref=>ref.get()){
 const keys=loadSaleKeys(loadId);
 const [group,config]=await Promise.all([
  read(db.collection(`empresas/${empresaId}/dados/sm2_carregamentos/registros`).where('grupoCargaId','==',loadId).limit(401)),
  read(db.doc(financeCollectionPath(empresaId)+'VendasCarga/'+keys.configId))
 ]);
 if(group.docs.length>400)throw new PlatformError(409,'Carga excede o limite de conferência.');
 return describeLoadSale(group.docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.id.localeCompare(b.id)),loadId,config.exists?config.data():null);
}

const promissoriaPaymentId=(loadId,numero)=>loadSaleKeys('promissoria-receipt:'+loadId+':'+numero).entryId;
const promissoriaReceiptRef=(db,empresaId,loadId)=>db.doc(saleReceiptPathV807(empresaId)+'/'+loadSaleKeys(loadId).entryId);

const paymentView=payment=>payment?{date:payment.date,amountCents:payment.amountCents,voided:!!payment.voidedAt}:null;
const linkedPayment=(payments,loadId,numero)=>payments.find(row=>row.id===promissoriaPaymentId(loadId,numero)||row.promissoriaParcela===numero);
const eligibleExistingPayment=(row,amountCents)=>!row.voidedAt&&row.amountCents===amountCents&&row.promissoriaParcela===undefined&&row.source?.type!=='promissoria';

export async function readPromissoriaPayment(db,empresaId,loadId,numero,read=ref=>ref.get()){
 const receipt=await read(promissoriaReceiptRef(db,empresaId,loadId));
 return paymentView(linkedPayment(receipt.data()?.settlement?.payments??[],loadId,numero));
}

export async function readPromissoriaPaymentOptions(db,empresaId,loadId,numero,amountCents,read=ref=>ref.get()){
 const receipt=await read(promissoriaReceiptRef(db,empresaId,loadId));
 const payments=receipt.data()?.settlement?.payments??[];
 const payment=paymentView(linkedPayment(payments,loadId,numero));
 const matchingPayments=payment?[]:payments.filter(row=>eligibleExistingPayment(row,amountCents)).map(row=>({id:row.id,date:row.date,amountCents:row.amountCents}));
 return {payment,matchingPayments};
}

export async function linkExistingPromissoriaPayment(db,identity,{empresaId,loadId,numero,amountCents,paymentId},now=Date.now()){
 if(typeof paymentId!=='string'||!/^[-a-f0-9]{36}$/i.test(paymentId))throw new PlatformError(400,'Selecione o recebimento que já entrou no caixa.');
 return db.runTransaction(async tx=>{
  const context=await financeOwnerContext(db,identity,ref=>tx.get(ref),true,now);
  if(context.empresaId!==empresaId)throw new PlatformError(403,'A empresa mudou.');
  const ref=promissoriaReceiptRef(db,empresaId,loadId),snap=await tx.get(ref),previous=snap.data();
  if(!previous||previous.loadId!==loadId)throw new PlatformError(409,'Nenhum recebimento encontrado para este carregamento.');
  const payments=previous.settlement?.payments??[];
  const linked=linkedPayment(payments,loadId,numero);
  if(linked){
   if(linked.id===paymentId&&!linked.voidedAt)return paymentView(linked);
   throw new PlatformError(409,'Esta promissória já tem um recebimento vinculado.');
  }
  const payment=payments.find(row=>row.id===paymentId);
  if(!payment||!eligibleExistingPayment(payment,amountCents))throw new PlatformError(409,'Escolha um recebimento ativo, ainda sem vínculo, com o mesmo valor desta promissória.');
  const updated={...payment,promissoriaParcela:numero,promissoriaLinkedAt:now,promissoriaLinkedBy:identity.uid};
  const next={...previous,settlement:{...previous.settlement,payments:payments.map(row=>row.id===paymentId?updated:row)},revision:previous.revision+1,updatedAt:now,updatedBy:identity.uid};
  tx.set(ref,next);
  tx.create(db.doc(ref.path+'/versoes/'+next.revision),{action:'sale-receipt.link-promissoria',at:now,by:identity.uid,previous,next});
  return paymentView(updated);
 });
}

export async function confirmPromissoriaPayment(db,identity,{empresaId,loadId,numero,amountCents,date,dueDate},now=Date.now()){
 if(!paymentDateV757(date)||date>paymentTodayV757(now))throw new PlatformError(400,'Informe a data do recebimento, sem usar uma data futura.');
 const context=await financeOwnerContext(db,identity,undefined,true,now);
 if(context.empresaId!==empresaId)throw new PlatformError(403,'A empresa mudou.');
 const receipt=await promissoriaReceiptRef(db,empresaId,loadId).get();
 const operationId=promissoriaPaymentId(loadId,numero);
 const previous=linkedPayment(receipt.data()?.settlement?.payments??[],loadId,numero);
 if(previous){
  if(previous.voidedAt)throw new PlatformError(409,'O recebimento desta promissória foi anulado em Recebimentos de vendas.');
  return {date:previous.date,amountCents:previous.amountCents,voided:false};
 }
 const sale=await saleForReceipt(db,empresaId,loadId);
 if(!sale)throw new PlatformError(409,'A carga precisa estar totalmente baixada para registrar o recebimento.');
 const request={companyId:empresaId,loadId,entryId:sale.id,saleDate:sale.date,
  signature:saleReceiptSignatureV807(sale),revision:receipt.data()?.revision||0,
  operationId,action:'promissoria',acknowledged:true,date,amountCents};
 const result=await saveSaleReceipt(db,identity,request,now,{numero,dueDate});
 const payment=result.entry.settlement.payments.find(row=>row.id===operationId);
 return {date:payment.date,amountCents:payment.amountCents,voided:!!payment.voidedAt};
}
