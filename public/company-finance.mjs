import {stockChartDate,stockChartPeriods} from './stock-charts.mjs';
export const FINANCE_TYPES=Object.freeze({purchase:'Compra',sale:'Venda',expense:'Despesa',loss:'Perda de madeira / material'});
export const FINANCE_CATEGORIES=Object.freeze({wood:'Madeira / produtos',freight:'Frete',processing:'Beneficiamento',tax:'Impostos e taxas',payroll:'Mão de obra',energy:'Energia',maintenance:'Manutenção',other:'Outros'});
export function financeCents(value){
 const text=String(value??'').trim();if(!/^\d+(?:[.,]\d{1,2})?$/.test(text))throw Error('Informe valores em reais, sem separador de milhar, com até duas casas decimais.');
 const [whole,decimal='']=text.replace(',','.').split('.'),cents=Number(whole)*100+Number(decimal.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents<0||cents>100000000000)throw Error('Valor fora do limite permitido.');return cents;
}
export function normalizeFinanceEntry(input){
 const fields=['id','revision','type','date','description','partner','reference','category','amountCents','costCents'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!fields.includes(k)))throw Error('Registro financeiro inválido.');
 if(typeof input.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id)||!Number.isSafeInteger(input.revision)||input.revision<0)throw Error('Identificação do registro inválida.');
 if(!Object.hasOwn(FINANCE_TYPES,input.type)||typeof input.date!=='string'||stockChartDate(input.date)!==input.date)throw Error('Confira o tipo e a data do registro.');
 const text=(key,max,required=false)=>{if(typeof input[key]!=='string'||input[key].trim().length>max||(required&&!input[key].trim()))throw Error('Confira a descrição, o cliente/fornecedor e a referência.');return input[key].trim();};
 const description=text('description',180,true),partner=text('partner',120),reference=text('reference',120);
 if(!Object.hasOwn(FINANCE_CATEGORIES,input.category))throw Error('Selecione uma categoria válida.');
 if(!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||input.amountCents>100000000000)throw Error('O valor total precisa ser maior que zero.');
 const cost=input.costCents;
 if(input.type==='sale'&&cost!==null&&(!Number.isSafeInteger(cost)||cost<0||cost>100000000000))throw Error('Informe o custo da madeira vendida ou deixe pendente.');
 if(input.type!=='sale'&&cost!==null)throw Error('O custo da madeira vendida pertence somente às vendas.');
 return {id:input.id.toLowerCase(),revision:input.revision,type:input.type,date:input.date,description,partner,reference,category:input.category,amountCents:input.amountCents,costCents:cost};
}
export function aggregateFinance(entries,{from,to,group='month'}){
 const rows=stockChartPeriods(from,to,group).map(key=>({key,purchase:0,sale:0,expense:0,loss:0,cost:0,pendingCosts:0,pendingSales:0,count:0})),map=new Map(rows.map(r=>[r.key,r]));
 const total={purchase:0,sale:0,expense:0,loss:0,cost:0,pendingCosts:0,pendingSales:0,count:0};
 for(const entry of entries){
  if(entry.date<from||entry.date>to)continue;
  if(entry.status==='pending-review'&&entry.source?.type==='load-sale'){const row=map.get(entry.date.slice(0,group==='month'?7:10));if(!row)throw Error('Data inválida na venda da carga.');row.pendingSales++;total.pendingSales++;continue;}
  if(entry.status!=='active')continue;
  if(!Object.hasOwn(FINANCE_TYPES,entry.type)||!Number.isSafeInteger(entry.amountCents)||entry.amountCents<0)throw Error('Registro financeiro inconsistente. Atualize a lista.');
  const row=map.get(entry.date.slice(0,group==='month'?7:10));if(!row)throw Error('Data inválida na lista financeira.');
  for(const target of [row,total]){target[entry.type]+=entry.amountCents;target.count++;if(entry.type==='sale'){if(entry.costCents===null)target.pendingCosts++;else if(Number.isSafeInteger(entry.costCents)&&entry.costCents>=0)target.cost+=entry.costCents;else throw Error('Custo inválido na venda.');}}
 }
 for(const row of [...rows,total]){const pending=row.pendingCosts||row.pendingSales;row.grossMargin=pending?null:row.sale-row.cost;row.result=pending?null:row.grossMargin-row.expense-row.loss;row.profit=row.result===null?null:Math.max(row.result,0);row.deficit=row.result===null?null:Math.max(-row.result,0);if(Object.entries(row).some(([key,n])=>key!=='key'&&n!==null&&!Number.isSafeInteger(n)))throw Error('Limite de cálculo financeiro atingido. Selecione um período menor.');}
 return {rows,total};
}
