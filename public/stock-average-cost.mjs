import {normalizeOpeningStockCost} from './opening-stock-cost.mjs';
import {stockCostKey,purchaseVolumeUnits,purchasePhysicalQuantityV755} from './stock-purchase.mjs';
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
// Physical pools remain distinct. Only an unpriced conference may borrow a prior
// carrying-cost reference from other dimensions of the same species/unit/state.
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
  // V391 records an actual conference entry before the user separately confirms the exit.
  // Unlike V390, keep its own recorded time; it may still be in stock without a paired exit.
  if(type==='ajuste'&&row.ajusteConferenciaV391===true&&row.grupoCargaId)type='entrada';
  if(!['entrada','saida'].includes(type)){invalidate(p,'Há um ajuste no histórico desta medida que precisa de conferência.');continue;}
  let quantity;try{quantity=purchaseVolumeUnits(Math.abs(Number(row.volume)));if(!quantity)continue;}catch{invalidate(p,'Há volume inválido no histórico desta medida.');continue;}
  const purchase=byMovement.get(row.id);let value=null,missingReason=null;
  if(purchase){seen.add(row.id);if(row.tipo!=='entrada'||purchase.costKey!==key||Math.abs(purchaseVolumeUnits(purchase.volume)-quantity)>1||row.purchaseReceiptV728!==purchase.receiptId||!Number.isSafeInteger(purchase.acquisitionCents)||purchase.acquisitionCents<0)invalidate(p,'A entrada da compra não confere com o volume e a medida registrados.');else value=BigInt(purchase.acquisitionCents)*costPrecisionV728;}
  if(type==='entrada'&&!purchase){
   if(row.purchaseReceiptV728)missingReason='A entrada tem referência de compra, mas o custo dessa compra não foi localizado neste financeiro.';
   else if(oldEnabled&&(row.tipoMedida||row.tipoCadastro||'m3')==='m3'&&at!==null&&at<=opening.cutoffAt)value=oldValue(quantity);
   else missingReason=row.ajusteConferenciaV391===true||row.ajusteConferenciaV390===true?'O ajuste de conferência acrescentou madeira sem custo de compra nesta medida. É preciso conferir a origem e o custo dessa entrada; o preço de venda não é usado como custo.':oldEnabled&&at>opening.cutoffAt?'Há entrada sem preço posterior ao salvamento do custo antigo. Essa entrada precisa do próprio custo.':'Há madeira sem custo de compra completo nesta medida.';
  }
  if(at===null)invalidate(p,'Falta uma data válida em uma entrada ou saída desta medida.');
  p.delta+=type==='entrada'?quantity:-quantity;if(!Number.isSafeInteger(p.delta))invalidate(p,'O histórico desta medida ultrapassa o limite de cálculo.');
  p.events.push({id:row.id,type,quantity,at:at||0,value,missingReason,conference:row.tipo==='ajuste'&&(row.ajusteConferenciaV391===true||row.ajusteConferenciaV390===true),loadId:type==='saida'?row.grupoCargaId:null});
 }
 for(const [id,line] of byMovement)if(!seen.has(id))invalidate(pool(line.costKey),'Falta o movimento de entrada de uma compra registrada. Aguarde a sincronização ou confira essa entrada.');
 const familyKey=key=>{const parts=JSON.parse(key);return JSON.stringify(parts.slice(0,parts[1]==='linear'?4:3));},families=new Map();
 const known=p=>!p.invalid&&!p.unknown&&p.qty>0;
 const contribution=p=>known(p)?{qty:BigInt(p.qty),value:p.value}:{qty:0n,value:0n};
 const updateFamily=(p,previous)=>{
  const id=familyKey(p.key);if(!families.has(id))families.set(id,{qty:0n,value:0n,lastKnown:null});
  const total=families.get(id),next=contribution(p);total.qty+=next.qty-previous.qty;total.value+=next.value-previous.value;
  if(known(p))p.lastOwn={qty:BigInt(p.qty),value:p.value,species:p.speciesValued};
 };
 const allEvents=[];
 for(const [key,p] of pools){
  p.key=key;p.tolerance=Math.min(1000,p.currentCount+p.events.length+1);
  p.qty=p.current-p.delta;p.value=0n;p.unknown=p.qty>0;p.unknownReason='O saldo inicial desta medida ainda não tem custo definido.';p.conferenceValued=false;p.speciesValued=false;p.lastOwn=null;
  if(p.qty<0&&p.qty>=-p.tolerance)p.qty=0;
  if(p.qty<0||!Number.isSafeInteger(p.qty))invalidate(p,'As entradas e saídas desta medida não fecham com o saldo atual.');
  if(p.qty>0&&!p.invalid&&oldEnabled&&JSON.parse(key)[1]==='m3'){p.value=oldValue(p.qty);p.unknown=false;p.unknownReason=null;}
  p.events.sort((a,b)=>a.at-b.at||(a.type===b.type?String(a.id).localeCompare(String(b.id)):a.type==='entrada'?-1:1));
  for(let n=1;n<p.events.length;n++)if(p.events[n].at===p.events[n-1].at&&p.events[n].type!==p.events[n-1].type)invalidate(p,'Há entrada e saída com o mesmo horário, sem ordem suficiente para conferir o custo.');
  updateFamily(p,{qty:0n,value:0n});
  for(const event of p.events)allEvents.push({p,event});
 }
 for(const total of families.values())if(total.qty>0n)total.lastKnown={qty:total.qty,value:total.value};
 allEvents.sort((a,b)=>a.event.at-b.event.at||a.p.key.localeCompare(b.p.key)||(a.event.type===b.event.type?String(a.event.id).localeCompare(String(b.event.id)):a.event.type==='entrada'?-1:1));
 for(let start=0;start<allEvents.length;){
  let end=start+1;while(end<allEvents.length&&allEvents[end].event.at===allEvents[start].event.at)end++;
  // All references at an instant use the balances strictly before that instant.
  // This avoids borrowing a same-time purchase or depending on document order.
  const familyBefore=new Map(),ownBefore=new Map();
  for(let n=start;n<end;n++){const p=allEvents[n].p,id=familyKey(p.key);if(!familyBefore.has(id))familyBefore.set(id,{...families.get(id)});if(!ownBefore.has(p.key))ownBefore.set(p.key,{...contribution(p),lastOwn:p.lastOwn});}
  for(let n=start;n<end;n++){
   const {p,event}=allEvents[n],previous=contribution(p);
   if(event.type==='entrada'){
    let entryValue=event.value,inherited=false,borrowed=false;
    if(entryValue===null&&event.conference&&p.qty>0&&!p.unknown&&!p.invalid){entryValue=costRoundV728(p.value*BigInt(event.quantity),BigInt(p.qty)*costPrecisionV728)*costPrecisionV728;inherited=true;}
    if(entryValue===null&&event.conference&&p.qty===0&&!p.invalid){
     const own=ownBefore.get(p.key),sum=familyBefore.get(familyKey(p.key)),siblings={qty:sum.qty-own.qty,value:sum.value-own.value,species:true},basis=own.lastOwn||(siblings.qty>0n?siblings:sum.lastKnown?{...sum.lastKnown,species:true}:siblings);
     if(basis.qty>0n&&basis.value>=0n){entryValue=costRoundV728(basis.value*BigInt(event.quantity),basis.qty*costPrecisionV728)*costPrecisionV728;inherited=true;borrowed=basis.species;}
    }
    if(p.qty===0){p.value=0n;p.unknown=false;p.unknownReason=null;p.conferenceValued=false;p.speciesValued=false;}p.qty+=event.quantity;
    if(!Number.isSafeInteger(p.qty))invalidate(p,'O saldo desta medida ultrapassa o limite de cálculo.');
    p.conferenceValued||=inherited;p.speciesValued||=borrowed;
    if(entryValue===null){p.unknown=true;p.unknownReason=event.missingReason||'Há madeira sem custo de compra completo nesta medida.';}else p.value+=entryValue;
   }else{
    if(p.qty<=0||event.quantity>p.qty+p.tolerance)invalidate(p,'A saída registrada supera o saldo reconstituído desta medida.');
    const valid=known(p),consumed=valid?costRoundV728(p.value*BigInt(Math.min(event.quantity,p.qty)),BigInt(p.qty)*costPrecisionV728)*costPrecisionV728:null;
    if(event.loadId){
     if(!loads.has(event.loadId))loads.set(event.loadId,{pending:false,reason:null,value:0n,volumes:new Map(),tolerances:new Map()});
     const load=loads.get(event.loadId);load.usesSpeciesReference||=valid&&p.speciesValued;load.usesConferenceAverage||=valid&&p.conferenceValued;load.pending||=!valid;if(!valid)load.reason||=p.reason||p.unknownReason;
     load.volumes.set(p.key,(load.volumes.get(p.key)||0)+event.quantity);load.tolerances.set(p.key,(load.tolerances.get(p.key)||0)+1);if(consumed!==null)load.value+=consumed;
    }
    if(valid)p.value-=consumed;p.qty-=event.quantity;
    if(p.qty<0){if(p.qty < -p.tolerance)invalidate(p,'A saída registrada supera o saldo reconstituído desta medida.');p.qty=0;}
    if(p.qty===0){p.unknown=false;p.value=0n;p.unknownReason=null;}
   }
   updateFamily(p,previous);
  }
  for(const id of familyBefore.keys()){const total=families.get(id);if(total.qty>0n)total.lastKnown={qty:total.qty,value:total.value};}
  start=end;
 }
 return loads;
}
export function weightedCostForLoad(items,projection){
 const id=String(items[0]?.grupoCargaId||''),found=projection?.get(id);if(!found||found.pending)return {costCents:null,reason:projection?.unavailableReason||found?.reason||'Falta o movimento de saída vinculado a esta carga. Aguarde a sincronização ou confira a baixa.'};
 const expected=new Map();for(const item of items){const key=stockCostKey(item);if(!key)return {costCents:null,reason:'Falta a identificação da unidade ou do produto para calcular o custo.'};let quantity;try{const physical=purchasePhysicalQuantityV755(item);quantity=purchaseVolumeUnits(physical);}catch{return {costCents:null,reason:'Volume da carga inválido.'};}expected.set(key,(expected.get(key)||0)+quantity);}
 if(expected.size!==found.volumes.size||[...expected].some(([key,qty])=>Math.abs(qty-(found.volumes.get(key)||0))>Math.min(1000,Math.max(10,items.length+(found.tolerances?.get(key)||0)))))return {costCents:null,reason:'As medidas ou volumes da carga não coincidem com a baixa registrada.'};
 const costCents=Number(costRoundV728(found.value,costPrecisionV728));if(!Number.isSafeInteger(costCents)||costCents<0)return {costCents:null,reason:'Custo acima do limite de cálculo.'};return {costCents,reason:null,usesConferenceAverage:found.usesConferenceAverage===true,usesSpeciesReference:found.usesSpeciesReference===true};
}

