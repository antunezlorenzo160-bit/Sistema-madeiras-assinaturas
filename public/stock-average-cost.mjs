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
export function projectWeightedStockCosts({purchases,movements,stock}){
 const pools=new Map(),byMovement=new Map(),loads=new Map();
 const pool=key=>{if(!pools.has(key))pools.set(key,{current:0,delta:0,events:[],invalid:false});return pools.get(key);};
 for(const receipt of purchases)for(const line of receipt.lines||[]){
  if(byMovement.has(line.movementId))throw Error('Entrada de compra repetida.');
  byMovement.set(line.movementId,{...line,receiptId:receipt.id,createdAt:receipt.createdAt});
 }
 for(const row of stock){const key=stockCostKey(row);if(!key)continue;const p=pool(key);try{p.current+=purchaseVolumeUnits(row.volume);if(!Number.isSafeInteger(p.current))p.invalid=true;}catch{p.invalid=true;}}
 const seen=new Set();
 for(const row of movements){
  if(row.transferencia===true)continue;
  const key=stockCostKey(row);if(!key)continue;
  const p=pool(key);if(!['entrada','saida'].includes(row.tipo)){p.invalid=true;continue;}
  let quantity;try{quantity=purchaseVolumeUnits(Math.abs(Number(row.volume)));if(!quantity)continue;}catch{p.invalid=true;continue;}
  const purchase=byMovement.get(row.id),at=movementTimeV728(row);let value=null;
  if(purchase){seen.add(row.id);if(row.tipo!=='entrada'||purchase.costKey!==key||Math.abs(purchaseVolumeUnits(purchase.volume)-quantity)>1||row.purchaseReceiptV728!==purchase.receiptId||!Number.isSafeInteger(purchase.acquisitionCents)||purchase.acquisitionCents<0)p.invalid=true;else value=BigInt(purchase.acquisitionCents)*costPrecisionV728;}
  if(at===null)p.invalid=true;
  p.delta+=row.tipo==='entrada'?quantity:-quantity;if(!Number.isSafeInteger(p.delta))p.invalid=true;
  p.events.push({id:row.id,type:row.tipo,quantity,at:at||0,value,loadId:row.tipo==='saida'?row.grupoCargaId:null});
 }
 for(const [id,line] of byMovement)if(!seen.has(id))pool(line.costKey).invalid=true;
 for(const [key,p] of pools){
  let qty=p.current-p.delta,value=0n,unknown=qty>0;if(qty<0||!Number.isSafeInteger(qty))p.invalid=true;
  const events=p.events.sort((a,b)=>a.at-b.at||(a.type===b.type?String(a.id).localeCompare(String(b.id)):a.type==='entrada'?-1:1));
  // Recorded history has second precision. Mixed directions in one second cannot establish order.
  for(let n=1;n<events.length;n++)if(events[n].at===events[n-1].at&&events[n].type!==events[n-1].type)p.invalid=true;
  for(const event of events){
   if(event.type==='entrada'){if(qty===0){value=0n;unknown=false;}qty+=event.quantity;if(event.value===null)unknown=true;else value+=event.value;continue;}
   const valid=!p.invalid&&!unknown&&qty>=event.quantity&&qty>0,consumed=valid?costRoundV728(value*BigInt(event.quantity),BigInt(qty)*costPrecisionV728)*costPrecisionV728:null;
   if(event.loadId){if(!loads.has(event.loadId))loads.set(event.loadId,{pending:false,value:0n,volumes:new Map()});const load=loads.get(event.loadId);load.pending||=!valid;load.volumes.set(key,(load.volumes.get(key)||0)+event.quantity);if(consumed!==null)load.value+=consumed;}
   if(valid)value-=consumed;qty-=event.quantity;if(qty<0){p.invalid=true;qty=0;}if(qty===0){unknown=false;value=0n;}
  }
 }
 return loads;
}
export function weightedCostForLoad(items,projection){
 const id=String(items[0]?.grupoCargaId||''),found=projection?.get(id);if(!found||found.pending)return {costCents:null,reason:'Estoque sem custo completo ou histórico de entrada/saída ainda não conferido.'};
 const expected=new Map();for(const item of items){const key=stockCostKey(item);if(!key)return {costCents:null,reason:'Custo automático disponível para madeira em m³ e a granel.'};let quantity;try{const physical=(item.tipoMedida||item.tipoCadastro||'m3')==='granel'?Number(item.volume):Number(item.largura)/100*Number(item.espessura)/100*Number(item.comprimento)*Number(item.quantidade);quantity=purchaseVolumeUnits(physical);}catch{return {costCents:null,reason:'Volume da carga inválido.'};}expected.set(key,(expected.get(key)||0)+quantity);}
 if(expected.size!==found.volumes.size||[...expected].some(([key,qty])=>Math.abs(qty-(found.volumes.get(key)||0))>Math.max(10,items.length)))return {costCents:null,reason:'As medidas ou volumes da carga não coincidem com a baixa registrada.'};
 const costCents=Number(costRoundV728(found.value,costPrecisionV728));if(!Number.isSafeInteger(costCents)||costCents<0)return {costCents:null,reason:'Custo acima do limite de cálculo.'};return {costCents,reason:null};
}
