import {saleReceivedCentsV807} from './sale-receipts.mjs';
import {paymentDateV757,purchasePaidCentsV757} from './purchase-payments.mjs';
const cashUuidV759=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const CASH_CATEGORIES_V759=Object.freeze({sale:'Recebimento de venda',contribution:'Aporte',refund:'Reembolso recebido',expense:'Despesa paga',withdrawal:'Retirada',other:'Outros'});
export function normalizeCashOpeningV759(input){
 if(!input||Object.keys(input).some(k=>!['date','amountCents','revision'].includes(k))||!paymentDateV757(input.date)||!Number.isSafeInteger(input.amountCents)||Math.abs(input.amountCents)>100000000000||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('Informe a data e o saldo no início do dia.');
 return {date:input.date,amountCents:input.amountCents,revision:input.revision};
}
export function normalizeCashMovementV759(input){
 if(!input||Object.keys(input).some(k=>!['id','date','direction','category','amountCents','description','partner','reference'].includes(k))||!cashUuidV759.test(input.id||'')||!paymentDateV757(input.date)||!['in','out'].includes(input.direction)||!Object.hasOwn(CASH_CATEGORIES_V759,input.category)||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||input.amountCents>100000000000)throw Error('Confira o tipo, a data e o valor da movimentação.');
 if(input.direction==='in'&&['expense','withdrawal'].includes(input.category)||input.direction==='out'&&['sale','contribution','refund'].includes(input.category))throw Error('A categoria não corresponde à entrada ou saída.');
 const text=(key,max,required=false)=>{const s=input[key];if(typeof s!=='string'||s.length>max||/[\u0000-\u001f]/.test(s)||required&&!s.trim())throw Error('Confira descrição, nome e documento.');return s.trim();};
 return {id:input.id,date:input.date,direction:input.direction,category:input.category,amountCents:input.amountCents,description:text('description',180,true),partner:text('partner',120),reference:text('reference',120)};
}
export function projectCashBookV759({opening=null,movements=[],purchases=[],sales=[],from,to}){
 if(!paymentDateV757(from)||!paymentDateV757(to)||from>to)throw Error('Confira o período do caixa.');
 if(opening)normalizeCashOpeningV759(opening);
 const rows=[],cancelledRows=[],ids=new Set();let unknownPurchases=0,cancelledPaidCents=0;
 for(const row of movements){if(row.status==='cancelled'){if(row.date>=from&&row.date<=to)cancelledRows.push(row);continue;}if(row.status!=='active')throw Error('Movimentação de caixa inconsistente.');const normalized=normalizeCashMovementV759(Object.fromEntries(['id','date','direction','category','amountCents','description','partner','reference'].map(k=>[k,row[k]])));if(ids.has(normalized.id))throw Error('Movimentação de caixa repetida.');ids.add(normalized.id);rows.push({...row,...normalized,source:row.source?.type==='log-labour-payment'?row.source:{type:'manual-cash'}});}
 for(const purchase of purchases){
  if(purchase.type!=='purchase')continue;
  purchasePaidCentsV757(purchase);
  if(purchase.status==='active'&&!purchase.settlement&&purchase.date<=to)unknownPurchases++;
  for(const payment of purchase.settlement?.payments||[]){
   if(payment.voidedAt)continue;
   const id='purchase:'+purchase.id+':'+payment.id;if(ids.has(id))throw Error('Pagamento de compra repetido no caixa.');ids.add(id);
   rows.push({id,date:payment.date,direction:'out',amountCents:payment.amountCents,category:'purchase',description:'Pagamento de compra'+(purchase.status==='cancelled'?' — compra cancelada':''),partner:purchase.partner||'',reference:purchase.reference||'',source:{type:'purchase-payment',entryId:purchase.id,paymentId:payment.id},createdAt:payment.createdAt||0,purchaseCancelled:purchase.status==='cancelled'});
   if(purchase.status==='cancelled'&&payment.date<=to&&(!opening||payment.date>=opening.date))cancelledPaidCents+=payment.amountCents;
  }
 }
 for(const sale of sales){
  if(sale.type!=='sale')continue;saleReceivedCentsV807(sale);
  for(const payment of sale.settlement?.payments||[]){
   if(payment.voidedAt)continue;const id='sale:'+sale.id+':'+payment.id;if(ids.has(id))throw Error('Recebimento de venda repetido no caixa.');ids.add(id);
   rows.push({id,date:payment.date,direction:'in',amountCents:payment.amountCents,category:'sale',description:'Recebimento de venda de madeira',partner:sale.partner||'',reference:sale.reference||'',source:{type:'sale-receipt',entryId:sale.id,paymentId:payment.id},createdAt:payment.createdAt||0});
  }
 }
 const start=opening&&opening.date>from?opening.date:from,validOpening=!!opening&&opening.date<=to;
 let periodOpeningCents=validOpening?opening.amountCents:opening?null:0,inCents=0,outCents=0;
 const displayed=[];
 for(const row of rows){
  if(row.date>to||opening&&row.date<opening.date)continue;
  if(row.date<start){if(periodOpeningCents!==null)periodOpeningCents+=row.direction==='in'?row.amountCents:-row.amountCents;continue;}
  if(row.direction==='in')inCents+=row.amountCents;else outCents+=row.amountCents;displayed.push(row);
 }
 const balanceCents=periodOpeningCents===null?null:periodOpeningCents+inCents-outCents;
 for(const amount of [periodOpeningCents,balanceCents,inCents,outCents,cancelledPaidCents])if(amount!==null&&!Number.isSafeInteger(amount))throw Error('Limite de cálculo do caixa atingido.');
 displayed.sort((a,b)=>a.date.localeCompare(b.date)||Number(a.createdAt||0)-Number(b.createdAt||0)||a.id.localeCompare(b.id));let running=periodOpeningCents;
 for(const row of displayed){if(running!==null)running+=row.direction==='in'?row.amountCents:-row.amountCents;row.balanceCents=running;}
 return {from,to,effectiveFrom:start,opening,periodOpeningCents,inCents,outCents,balanceCents,unknownPurchases,cancelledPaidCents,rows:displayed,cancelledRows};
}
