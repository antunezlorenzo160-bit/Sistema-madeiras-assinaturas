import {aggregateFinance} from './company-finance.mjs';
// Explain the same ledger arithmetic by sale; never allocate general expenses by guesswork.
export function reconcileFinanceSales(entries,range){
 const report=aggregateFinance(entries,range),active=entries.filter(e=>e.status==='active'&&e.date>=range.from&&e.date<=range.to),sales=active.filter(e=>e.type==='sale'),loadIds=new Set(),assigned=new Map();
 const shared=active.filter(e=>e.type==='expense'&&e.source?.type==='shared-trip');
 for(const entry of shared){
  const allocations=entry.source.allocations,ids=new Set();let sum=0;
  if(!Array.isArray(allocations)||allocations.length<2||allocations.length>20)throw Error('Confira o rateio da viagem compartilhada.');
  for(const part of allocations){if(!part||typeof part.loadId!=='string'||ids.has(part.loadId)||!Number.isSafeInteger(part.amountCents)||part.amountCents<0)throw Error('Confira o rateio da viagem compartilhada.');ids.add(part.loadId);sum+=part.amountCents;}
  if(sum!==entry.amountCents)throw Error('O rateio da viagem não fecha com a despesa. Confira a viagem compartilhada.');
 }
 const pendingReviews=entries.filter(e=>e.type==='sale'&&e.status==='pending-review'&&e.source?.type==='load-sale'&&e.date>=range.from&&e.date<=range.to).map(e=>({id:e.id,loadId:e.source?.loadId||null,partner:e.partner||'',amountCents:e.amountCents}));
 const rows=sales.map(sale=>{
  const source=sale.source||{},loadId=source.type==='load-sale'?source.loadId:null;
  if(loadId){if(loadIds.has(loadId))throw Error('Há duas vendas para a mesma carga. Confira os registros.');loadIds.add(loadId);}
  const transport=loadId?active.filter(e=>e.type==='expense'&&e.source?.type==='load-transport'&&e.source.loadId===loadId):[];
  let transportCents=transport.reduce((n,e)=>n+e.amountCents,0),sharedCount=0;transport.forEach(e=>assigned.set(e,(assigned.get(e)||0)+e.amountCents));
  if(loadId)for(const expense of shared){const part=expense.source.allocations.find(a=>a.loadId===loadId);if(part){transportCents+=part.amountCents;sharedCount++;assigned.set(expense,(assigned.get(expense)||0)+part.amountCents);}}
  const physicalM3=Number.isFinite(source.physicalM3)&&source.physicalM3>0?source.physicalM3:null,manual=source.type!=='load-sale'||source.costMode==='manual',automaticCostCents=Number.isSafeInteger(source.automaticCostCents)&&source.automaticCostCents>=0?source.automaticCostCents:null;
  const netCents=sale.costCents===null?null:sale.amountCents-sale.costCents-transportCents;
  if(netCents!==null&&!Number.isSafeInteger(netCents))throw Error('Limite de cálculo atingido na conferência da venda.');
  return {id:sale.id,billedFreightCents:Number.isSafeInteger(source.freightCents)?source.freightCents:0,billedOtherCents:Number.isSafeInteger(source.otherCents)?source.otherCents:0,loadId,date:sale.date,partner:sale.partner||'',description:sale.description,amountCents:sale.amountCents,costCents:sale.costCents,physicalM3,unitEquivalentCents:physicalM3!==null&&sale.costCents!==null?Math.round(sale.costCents/physicalM3):null,manual,usesConferenceAverage:source.usesConferenceAverage===true,usesSpeciesReference:source.usesSpeciesReference===true,automaticCostCents,automaticUnitCents:physicalM3!==null&&automaticCostCents!==null?Math.round(automaticCostCents/physicalM3):null,manualDiffers:manual&&sale.costCents!==null&&automaticCostCents!==null&&sale.costCents!==automaticCostCents,transportCents,transportCount:transport.length+sharedCount,sharedTripCount:sharedCount,netCents,automaticPendingReason:source.automaticCostPendingReason||null,pendingReason:source.costRequiresReview?'As peças ou quantidades mudaram. Confira o custo atualizado desta carga.':source.costPendingReason||null};
 });
 const otherExpenseCents=active.filter(e=>e.type==='expense').reduce((n,e)=>{const part=assigned.get(e)||0;if(part>e.amountCents)throw Error('Despesa rateada mais de uma vez.');return n+e.amountCents-part;},0),saleCostCents=rows.reduce((n,row)=>n+(row.costCents||0),0),transportCents=rows.reduce((n,row)=>n+row.transportCents,0);
 if(saleCostCents!==report.total.cost||transportCents+otherExpenseCents!==report.total.expense)throw Error('A conferência por venda não fecha com os totais do período.');
 const reconciledResult=report.total.result===null?null:rows.reduce((n,row)=>n+row.netCents,0)-otherExpenseCents-report.total.loss;
 if(reconciledResult!==report.total.result)throw Error('O resultado por venda não fecha com o resumo do período.');
 return {rows,pendingReviews,pendingCosts:report.total.pendingCosts,otherExpenseCents,lossCents:report.total.loss,costTotalCents:saleCostCents,resultCents:reconciledResult,manualCount:rows.filter(r=>r.manual).length,manualDifferenceCount:rows.filter(r=>r.manualDiffers).length,pendingSales:report.total.pendingSales};
}
