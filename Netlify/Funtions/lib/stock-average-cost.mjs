import {readOpeningStockCost} from './opening-stock-cost.mjs';
import {purchaseRecordsPath} from './stock-purchase.mjs';
import {projectWeightedStockCosts} from '../../../public/stock-average-cost.mjs';
const unavailable=reason=>Object.assign(new Map(),{unavailableReason:reason});
export async function readWeightedStockCosts(db,empresaId,woodIds=null,openingPolicy=undefined){
 if(openingPolicy===undefined)openingPolicy=await readOpeningStockCost(db,empresaId);
 const purchasesSnap=await db.collection(purchaseRecordsPath(empresaId)).limit(1001).get();if(purchasesSnap.docs.length>1000)return unavailable('O histórico de compras ultrapassa o limite da conferência automática do custo.');
 if(!purchasesSnap.docs.length&&openingPolicy.unitCents===null)return unavailable('Defina o custo do estoque antigo ou registre a compra dessa madeira para calcular o custo.');
 const rows=s=>s.docs.map(doc=>({...doc.data(),id:doc.id}));
 if(rows(purchasesSnap).some(receipt=>!Array.isArray(receipt.lines)))return unavailable('Há uma compra com dados incompletos para conferir o custo.');
 const wanted=woodIds?new Set([...woodIds].filter(id=>typeof id==='string'&&/^[-\w]{1,180}$/.test(id))):new Set(rows(purchasesSnap).flatMap(receipt=>receipt.lines.map(line=>line.madeiraId)));
 if(!wanted.size)return unavailable('Falta a identificação da madeira no cadastro para conferir esta carga.');
 if(wanted.size>20)return unavailable('A consulta de custo reúne mais de 20 espécies. Consulte um período com menos espécies.');
 const purchases=rows(purchasesSnap).map(receipt=>({...receipt,lines:receipt.lines.filter(line=>wanted.has(line.madeiraId))})).filter(receipt=>receipt.lines.length);
 if(!purchases.length&&openingPolicy.unitCents===null)return unavailable('Não há custo de compra ou de estoque antigo registrado para a madeira desta carga.');
 const ids=[...wanted],chunks=[];for(let n=0;n<ids.length;n+=10)chunks.push(ids.slice(n,n+10));
 const paths=['sm2_movimentos','sm2_estoque1','sm2_estoque2'],snapshots=await Promise.all(paths.map(async name=>{
  const chunksSnap=await Promise.all(chunks.map(chunk=>db.collection(`empresas/${empresaId}/dados/${name}/registros`).where('madeiraId','in',chunk).limit(5001).get()));
  return chunksSnap.some(s=>s.docs.length>5000)?null:chunksSnap.flatMap(rows);
 }));
 if(snapshots.some(s=>s===null)||snapshots.reduce((sum,s)=>sum+s.length,0)>10000)return unavailable('O histórico físico ultrapassa o limite da conferência automática do custo.');
 try{return projectWeightedStockCosts({openingPolicy,purchases,movements:snapshots[0],stock:[...snapshots[1],...snapshots[2]]});}catch{return unavailable('Há dados inválidos no histórico físico ou na compra. O custo precisa de conferência.');}
}
