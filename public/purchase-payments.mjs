const paymentUuidV757=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function paymentDateV757(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function normalizePurchasePaymentV757(input,totalCents,purchaseDate){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['mode','dueDate','paidDate','paidCents'].includes(k))||!['cash','credit','partial'].includes(input.mode))throw Error('Selecione à vista, a prazo ou pagamento parcial.');
 if(!Number.isSafeInteger(totalCents)||totalCents<=0||!paymentDateV757(purchaseDate))throw Error('Total ou data da compra inválidos.');
 const cash=input.mode==='cash',credit=input.mode==='credit',paidCents=cash?totalCents:credit?0:input.paidCents,dueDate=cash?null:input.dueDate,paidDate=credit?null:input.paidDate;
 if(!Number.isSafeInteger(paidCents)||paidCents<0||paidCents>totalCents||input.mode==='partial'&&(!paidCents||paidCents>=totalCents))throw Error('O pagamento parcial deve ser maior que zero e menor que o total.');
 if(!cash&&(!paymentDateV757(dueDate)||dueDate<purchaseDate))throw Error('Informe o vencimento a partir da data da compra.');
 if(!credit&&(!paymentDateV757(paidDate)||paidDate<purchaseDate))throw Error('Informe a data do pagamento a partir da data da compra.');
 return {mode:input.mode,dueDate,paidDate,paidCents};
}
export function purchaseSettlementV757(config,now,uid,eventId=config.id){
 if(!config.payment)return null;
 const terms=normalizePurchasePaymentV757(config.payment,config.totalCents,config.date);
 return {mode:terms.mode,dueDate:terms.dueDate,payments:terms.paidCents?[{id:eventId,date:terms.paidDate,amountCents:terms.paidCents,createdAt:now,createdBy:uid}]:[]};
}
export function purchasePaidCentsV757(entry,to='9999-12-31'){
 let paid=0;const ids=new Set();
 for(const row of entry.settlement?.payments||[]){if(!paymentUuidV757.test(row.id||'')||ids.has(row.id)||!paymentDateV757(row.date)||!Number.isSafeInteger(row.amountCents)||row.amountCents<=0)throw Error('Pagamento de compra inconsistente.');ids.add(row.id);if(!row.voidedAt&&row.date<=to)paid+=row.amountCents;}
 if(!Number.isSafeInteger(paid)||paid>entry.amountCents)throw Error('Pagamentos acima do valor da compra.');return paid;
}
export function purchaseAccountsV757(entries,{from,to}){
 if(!paymentDateV757(from)||!paymentDateV757(to)||from>to)throw Error('Confira o período dos pagamentos.');
 let paidInPeriodCents=0,payableCents=0,overdueCents=0,unknownCount=0,cancelledPaidCents=0;
 const rows=[];
 for(const entry of entries){
  if(entry.type!=='purchase')continue;
  const paid=purchasePaidCentsV757(entry,to);
  for(const payment of entry.settlement?.payments||[])if(!payment.voidedAt&&payment.date>=from&&payment.date<=to)paidInPeriodCents+=payment.amountCents;
  if(entry.date>to)continue;
  if(entry.status==='cancelled'){cancelledPaidCents+=paid;if(paid)rows.push({...entry,paidCents:paid,payableCents:0,paymentUnknown:false});continue;}
  if(entry.status!=='active')continue;
  const unknown=!entry.settlement,remaining=unknown?null:entry.amountCents-paid;
  if(unknown)unknownCount++;else{payableCents+=remaining;if(remaining&&entry.settlement.dueDate&&entry.settlement.dueDate<to)overdueCents+=remaining;}
  rows.push({...entry,paidCents:unknown?null:paid,payableCents:remaining,paymentUnknown:unknown});
 }
 for(const value of [paidInPeriodCents,payableCents,overdueCents,cancelledPaidCents])if(!Number.isSafeInteger(value))throw Error('Limite do relatório de pagamentos atingido.');
 return {from,to,paidInPeriodCents,payableCents,overdueCents,unknownCount,cancelledPaidCents,rows:rows.sort((a,b)=>(a.settlement?.dueDate||a.date).localeCompare(b.settlement?.dueDate||b.date))};
}
