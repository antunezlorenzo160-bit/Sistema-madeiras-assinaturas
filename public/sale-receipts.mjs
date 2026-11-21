import {paymentDateV757} from './purchase-payments.mjs';
const saleReceiptUuidV807=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function normalizeSaleReceiptV807(input,totalCents,saleDate){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['mode','dueDate','paidDate','paidCents'].includes(k))||!['cash','credit','partial'].includes(input.mode))throw Error('Selecione à vista, a prazo ou recebimento parcial.');
 if(!Number.isSafeInteger(totalCents)||totalCents<=0||!paymentDateV757(saleDate))throw Error('Total ou data da venda inválidos.');
 const cash=input.mode==='cash',credit=input.mode==='credit',paidCents=cash?totalCents:credit?0:input.paidCents,dueDate=cash?null:input.dueDate,paidDate=credit?null:input.paidDate;
 if(!Number.isSafeInteger(paidCents)||paidCents<0||paidCents>totalCents||input.mode==='partial'&&(!paidCents||paidCents>=totalCents))throw Error('O recebimento parcial deve ser maior que zero e menor que o total.');
 if(!cash&&(!paymentDateV757(dueDate)||dueDate<saleDate))throw Error('Informe o vencimento a partir da data da venda.');
 if(!credit&&(!paymentDateV757(paidDate)||paidDate<saleDate))throw Error('Informe a data do recebimento a partir da data da venda.');
 return {mode:input.mode,dueDate,paidDate,paidCents};
}
export function saleSettlementV807(config,now,uid,eventId=config.id){
 if(!config.payment)return null;
 const terms=normalizeSaleReceiptV807(config.payment,config.totalCents,config.date);
 return {mode:terms.mode,dueDate:terms.dueDate,payments:terms.paidCents?[{id:eventId,date:terms.paidDate,amountCents:terms.paidCents,createdAt:now,createdBy:uid}]:[]};
}
export function saleReceivedCentsV807(entry,to='9999-12-31'){
 let paid=0;const ids=new Set();
 for(const row of entry.settlement?.payments||[]){if(!saleReceiptUuidV807.test(row.id||'')||ids.has(row.id)||!paymentDateV757(row.date)||!Number.isSafeInteger(row.amountCents)||row.amountCents<=0)throw Error('Recebimento de venda inconsistente.');ids.add(row.id);if(!row.voidedAt&&row.date<=to)paid+=row.amountCents;}
 if(!Number.isSafeInteger(paid)||paid>entry.amountCents)throw Error('Recebimentos acima do valor da venda.');return paid;
}
export function saleAccountsV807(entries,{from,to}){
 if(!paymentDateV757(from)||!paymentDateV757(to)||from>to)throw Error('Confira o período dos recebimentos.');
 let paidInPeriodCents=0,receivableCents=0,overdueCents=0,unknownCount=0,cancelledPaidCents=0;
 const rows=[];
 for(const entry of entries){
  if(entry.type!=='sale')continue;
  const paid=saleReceivedCentsV807(entry,to);
  for(const payment of entry.settlement?.payments||[])if(!payment.voidedAt&&payment.date>=from&&payment.date<=to)paidInPeriodCents+=payment.amountCents;
  if(entry.date>to)continue;
  if(entry.status==='cancelled'){cancelledPaidCents+=paid;if(paid)rows.push({...entry,paidCents:paid,receivableCents:0,paymentUnknown:false});continue;}
  if(entry.status!=='active')continue;
  const unknown=!entry.settlement,remaining=unknown?null:entry.amountCents-paid;
  if(unknown)unknownCount++;else{receivableCents+=remaining;if(remaining&&entry.settlement.dueDate&&entry.settlement.dueDate<to)overdueCents+=remaining;}
  rows.push({...entry,paidCents:unknown?null:paid,receivableCents:remaining,paymentUnknown:unknown});
 }
 for(const value of [paidInPeriodCents,receivableCents,overdueCents,cancelledPaidCents])if(!Number.isSafeInteger(value))throw Error('Limite do relatório de recebimentos atingido.');
 return {from,to,paidInPeriodCents,receivableCents,overdueCents,unknownCount,cancelledPaidCents,rows:rows.sort((a,b)=>(a.settlement?.dueDate||a.date).localeCompare(b.settlement?.dueDate||b.date))};
}
