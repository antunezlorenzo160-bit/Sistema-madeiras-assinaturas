import {purchaseRecordsPath} from './stock-purchase.mjs';
import {projectWeightedStockCosts} from '../../../public/stock-average-cost.mjs';
export async function readWeightedStockCosts(db,empresaId,woodIds=null){
 const purchasesSnap=await db.collection(purchaseRecordsPath(empresaId)).limit(1001).get();if(!purchasesSnap.docs.length||purchasesSnap.docs.length>1000)return null;
 const rows=s=>s.docs.map(doc=>({...doc.data(),id:doc.id})),wanted=woodIds?new Set([...woodIds].filter(id=>typeof id==='string'&&/^[-\w]{1,180}$/.test(id))):new Set(rows(purchasesSnap).flatMap(receipt=>receipt.lines.map(line=>line.madeiraId)));
 if(!wanted.size||wanted.size>20)return null;
 const purchases=rows(purchasesSnap).map(receipt=>({...receipt,lines:receipt.lines.filter(line=>wanted.has(line.madeiraId))})).filter(receipt=>receipt.lines.length);
 if(!purchases.length)return null;
 const ids=[...wanted],chunks=[];for(let n=0;n<ids.length;n+=10)chunks.push(ids.slice(n,n+10));
 const paths=['sm2_movimentos','sm2_estoque1','sm2_estoque2'],snapshots=await Promise.all(paths.map(async name=>{
  const chunksSnap=await Promise.all(chunks.map(chunk=>db.collection(`empresas/${empresaId}/dados/${name}/registros`).where('madeiraId','in',chunk).limit(5001).get()));
  return chunksSnap.some(s=>s.docs.length>5000)?null:chunksSnap.flatMap(rows);
 }));
 if(snapshots.some(s=>s===null)||snapshots.reduce((sum,s)=>sum+s.length,0)>10000)return null;
 try{return projectWeightedStockCosts({purchases,movements:snapshots[0],stock:[...snapshots[1],...snapshots[2]]});}catch{return null;}
}
