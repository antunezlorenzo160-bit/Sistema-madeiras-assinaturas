import {normalizeOpeningStockCost} from './opening-stock-cost.mjs';
import {stockCostKey,purchaseVolumeUnits} from './stock-purchase.mjs';
const costPrecisionV728=1000000n;
const costRoundV728=(n,d)=>(n+d/2n)/d;
function movementTimeV728(row){
 if(Number.isSafeInteger(row.costRecordedAtV728)&&row.costRecordedAtV728>0)return row.costRecordedAtV728;
 // Recorded time is authoritative; an edit timestamp must not move an old exit after a new buy.
 const recorded=String(row.data||''),m=recorded.match(/^(\d{2})\/(\d{2})\/(\d{4}),?\s+(\d{2}):(\d{2}):(\d{2})$/);
 if(m){const at=Date.parse(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}-03:00`);if(Number.isFinite(at))return at;}
 if(row.purchaseReceiptV728&&Number.isSafeInteger(row.atualizadoEm))return row.atualizadoEm;
 return null;
}
// Pooled across locations, but never across species, dimensions, units or dry/green state.
export function projectWeightedStockCosts({purchases,movements,stock,openingPolicy={}}){
 const opening=normalizeOpeningStockCost(openingPolicy),oldEnabled=opening.unitCents!==null&&opening.revision>0&&opening.cutoffAt>0;
 const oldValue=qty=>costRoundV728(BigInt(qty)*BigInt(opening.unitCents),1000000000n)*costPrecisionV728;
 const pools=new Map(),byMovement=new Map(),loads=new Map(),conferenceExits=new Map();
 const pool=key=>{if(!pools.has(key))pools.set(key,{current:0,currentCount:0,delta:0,events:[],invalid:false,reason:null});return pools.get(key);};
 const invalidate=(p,reason)=>{p.invalid=true;p.reason||=reason;};
 // The application's quick conference adds missing physical pieces immediately before
 // their exit, but records its adjustment after the exit. Reconstruct that exact pair.
 for(const row of movements){if(row.tipo!=='saida'||row.transferencia===true||!row.grupoCargaId)continue;const key=stockCostKey(row),at=movementTimeV728(row);if(!key||at===null)continue;const id=JSON.stringify([key,row.grupoCargaId]);conferenceExits.set(id,Math.min(conferenceExits.get(id)??Infinity,at));}
 for(const receipt of purchases)for(const line of receipt.lines||[]){
  if(byMovement.has(line.movementId))throw Error('Entrada de compra repetida.');
  byMovement.set(line.movementId,{...line,receiptId:receipt.id,createdAt:receipt.createdAt});
 }
 for(const row of stock){const key=stockCostKey(row);if(!key)continue;const p=pool(key);p.currentCount++;try{p.current+=purchaseVolumeUnits(row.volume);if(!Number.isSafeInteger(p.current))invalidate(p,'O saldo desta medida ultrapassa o limite de cálculo.');}catch{invalidate(p,'Há volume inválido no saldo desta medida.');}}
 const seen=new Set();
 for(const row of movements){
  if(row.transferencia===true)continue;
  const key=stockCostKey(row);if(!key)continue;
  const p=pool(key);let type=row.tipo,at=movementTimeV728(row);
  if(type==='ajuste'&&row.ajusteConferenciaV390===true&&row.grupoCargaId){
   const paired=conferenceExits.get(JSON.stringify([key,row.grupoCargaId]));
   if(paired!==undefined){type='entrada';at=paired-1;}
  }
  if(!['entrada','saida'].includes(type)){invalidate(p,'Há um ajuste no histórico desta medida que precisa de conferência.');continue;}
  let quantity;try{quantity=purchaseVolumeUnits(Math.abs(Number(row.volume)));if(!quantity)continue;}catch{invalidate(p,'Há volume inválido no histórico desta medida.');continue;}
  const purchase=byMovement.get(row.id);let value=null,missingReason=null;
  if(purchase){seen.add(row.id);if(row.tipo!=='entrada'||purchase.costKey!==key||Math.abs(purchaseVolumeUnits(purchase.volume)-quantity)>1||row.purchaseReceiptV728!==purchase.receiptId||!Number.isSafeInteger(purchase.acquisitionCents)||purchase.acquisitionCents<0)invalidate(p,'A entrada da compra não confere com o volume e a medida registrados.');else value=BigInt(purchase.acquisitionCents)*costPrecisionV728;}
  if(type==='entrada'&&!purchase){
   if(row.purchaseReceiptV728)missingReason='A entrada tem referência de compra, mas o custo dessa compra não foi localizado neste financeiro.';
   else if(oldEnabled&&(row.tipoMedida||row.tipoCadastro||'m3')==='m3'&&at!==null&&at<=opening.cutoffAt)value=oldValue(quantity);
   else missingReason=oldEnabled&&at>opening.cutoffAt?'Há entrada sem preço posterior ao salvamento do custo antigo. Essa entrada precisa do próprio custo.':'Há madeira sem custo de compra completo nesta medida.';
  }
  if(at===null)invalidate(p,'Falta uma data válida em uma entrada ou saída desta medida.');
  p.delta+=type==='entrada'?quantity:-quantity;if(!Number.isSafeInteger(p.delta))invalidate(p,'O histórico desta medida ultrapassa o limite de cálculo.');
  p.events.push({id:row.id,type,quantity,at:at||0,value,missingReason,loadId:type==='saida'?row.grupoCargaId:null});
 }
 for(const [id,line] of byMovement)if(!seen.has(id))invalidate(pool(line.costKey),'Falta o movimento de entrada de uma compra registrada. Aguarde a sincronização ou confira essa entrada.');
 for(const [key,p] of pools){
  // One unit is 1e-9 m³. Allow only the bounded accumulated rounding error, never a real shortage.
  const tolerance=Math.min(1000,p.currentCount+p.events.length+1);
  let qty=p.current-p.delta,value=0n,unknown=qty>0,unknownReason='O saldo inicial desta medida ainda não tem custo definido.';
  if(qty<0&&qty>=-tolerance)qty=0;
  if(qty<0||!Number.isSafeInteger(qty))invalidate(p,'As entradas e saídas desta medida não fecham com o saldo atual.');
  // Positive pre-history balance is opening stock even when its first recorded exit
  // happened after the valuation date. Later, recorded unpriced entries stay unknown.
  if(qty>0&&!p.invalid&&oldEnabled&&JSON.parse(key)[1]==='m3'){value=oldValue(qty);unknown=false;unknownReason=null;}
  const events=p.events.sort((a,b)=>a.at-b.at||(a.type===b.type?String(a.id).localeCompare(String(b.id)):a.type==='entrada'?-1:1));
  for(let n=1;n<events.length;n++)if(events[n].at===events[n-1].at&&events[n].type!==events[n-1].type)invalidate(p,'Há entrada e saída com o mesmo horário, sem ordem suficiente para conferir o custo.');
  for(const event of events){
   if(event.type==='entrada'){
    if(qty===0){value=0n;unknown=false;unknownReason=null;}qty+=event.quantity;
    if(event.value===null){unknown=true;unknownReason=event.missingReason||'Há madeira sem custo de compra completo nesta medida.';}else value+=event.value;
    continue;
   }
   if(qty<=0||event.quantity>qty+tolerance)invalidate(p,'A saída registrada supera o saldo reconstituído desta medida.');
   const valid=!p.invalid&&!unknown&&qty>0,consumed=valid?costRoundV728(value*BigInt(Math.min(event.quantity,qty)),BigInt(qty)*costPrecisionV728)*costPrecisionV728:null;
   if(event.loadId){
    if(!loads.has(event.loadId))loads.set(event.loadId,{pending:false,reason:null,value:0n,volumes:new Map(),tolerances:new Map()});
    const load=loads.get(event.loadId);load.pending||=!valid;if(!valid)load.reason||=p.reason||unknownReason;
    load.volumes.set(key,(load.volumes.get(key)||0)+event.quantity);load.tolerances.set(key,(load.tolerances.get(key)||0)+1);if(consumed!==null)load.value+=consumed;
   }
   if(valid)value-=consumed;qty-=event.quantity;
   if(qty<0){if(qty < -tolerance)invalidate(p,'A saída registrada supera o saldo reconstituído desta medida.');qty=0;}
   if(qty===0){unknown=false;value=0n;unknownReason=null;}
  }
 }
 return loads;
}
export function weightedCostForLoad(items,projection){
 const id=String(items[0]?.grupoCargaId||''),found=projection?.get(id);if(!found||found.pending)return {costCents:null,reason:projection?.unavailableReason||found?.reason||'Falta o movimento de saída vinculado a esta carga. Aguarde a sincronização ou confira a baixa.'};
 const expected=new Map();for(const item of items){const key=stockCostKey(item);if(!key)return {costCents:null,reason:'Custo automático disponível para madeira em m³ e a granel.'};let quantity;try{const physical=(item.tipoMedida||item.tipoCadastro||'m3')==='granel'?Number(item.volume):Number(item.largura)/100*Number(item.espessura)/100*Number(item.comprimento)*Number(item.quantidade);quantity=purchaseVolumeUnits(physical);}catch{return {costCents:null,reason:'Volume da carga inválido.'};}expected.set(key,(expected.get(key)||0)+quantity);}
 if(expected.size!==found.volumes.size||[...expected].some(([key,qty])=>Math.abs(qty-(found.volumes.get(key)||0))>Math.min(1000,Math.max(10,items.length+(found.tolerances?.get(key)||0)))))return {costCents:null,reason:'As medidas ou volumes da carga não coincidem com a baixa registrada.'};
 const costCents=Number(costRoundV728(found.value,costPrecisionV728));if(!Number.isSafeInteger(costCents)||costCents<0)return {costCents:null,reason:'Custo acima do limite de cálculo.'};return {costCents,reason:null};
}
