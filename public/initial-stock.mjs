import {normalizeStockPurchase} from './stock-purchase.mjs';
export function normalizeInitialStockV811(input){
 const allowed=['companyId','id','date','reference','stock','lines','operation','acknowledged'];
 if(!input||Object.keys(input).some(k=>!allowed.includes(k))||input.operation!=='opening'||input.acknowledged!==true)throw Error('Confirme que esta madeira inicial ainda não foi lançada no estoque.');
 const base=normalizeStockPurchase({companyId:input.companyId,id:input.id,date:input.date,reference:input.reference,stock:input.stock,lines:input.lines,supplier:'Estoque inicial',freightCents:0,otherCents:0,freightIncluded:true,otherIncluded:true},{opening:true});
 return {...base,kind:'opening-stock',unknownCostLines:base.lines.filter(line=>line.unitCents===null).length};
}
export function normalizeInitialDebtV811(input){
 if(!input||Object.keys(input).some(k=>!['companyId','id','date','supplier','reference','amountCents','dueDate'].includes(k))||!/^[-\w]{1,120}$/.test(input.companyId||'')||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id||''))throw Error('Identificação da dívida inválida.');
 const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 if(!date(input.date)||!date(input.dueDate)||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||input.amountCents>100000000000)throw Error('Confira a data, o vencimento e o saldo ainda devido.');
 const text=(value,max)=>{if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value))throw Error('Confira fornecedor e referência da dívida.');return value.trim();};
 const supplier=text(input.supplier,120),reference=text(input.reference,180);if(!supplier)throw Error('Informe o fornecedor da dívida anterior.');
 return {companyId:input.companyId,id:input.id,date:input.date,supplier,reference,amountCents:input.amountCents,dueDate:input.dueDate};
}
