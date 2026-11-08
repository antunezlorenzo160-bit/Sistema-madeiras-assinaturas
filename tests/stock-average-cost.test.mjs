import test from 'node:test';import assert from 'node:assert/strict';
import {projectWeightedStockCosts,weightedCostForLoad} from '../public/stock-average-cost.mjs';
import {stockCostKey} from '../public/stock-purchase.mjs';
const physical=(extra={})=>({madeiraId:'wood',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,estadoMadeira:'seca',...extra});
const time=h=>'08/11/2026, '+String(h).padStart(2,'0')+':00:00';
const move=(id,type,volume,h,extra={})=>({...physical(),id,tipo:type,volume,data:time(h),...extra});
const buy=(id,volume,cents,h,extra={})=>{const row=move(id,'entrada',volume,h,{purchaseReceiptV728:id,...extra});return {receipt:{id,createdAt:Date.UTC(2026,10,8,h+3),lines:[{...physical(extra),volume,acquisitionCents:cents,movementId:id,costKey:stockCostKey(row)}]},row};};
const cost=(projection,id,volume,extra={})=>{const dimensions=physical(extra);return weightedCostForLoad([{...dimensions,quantidade:volume/(dimensions.largura/100*dimensions.espessura/100*dimensions.comprimento),grupoCargaId:id,volume}],projection);};
test('weighted average retains remaining inventory cost, not a simple average of unit prices',()=>{
 const a=buy('a',10,1000000,8),b=buy('b',10,2000000,10),events=[a.row,move('out-a','saida',5,9,{grupoCargaId:'first'}),b.row,move('out-b','saida',5,11,{grupoCargaId:'second'})];
 const result=projectWeightedStockCosts({purchases:[a.receipt,b.receipt],movements:events,stock:[{...physical(),volume:10}]});
 assert.equal(cost(result,'first',5).costCents,500000);assert.equal(cost(result,'second',5).costCents,833333);
 assert.equal(cost(result,'second',6).costCents,null);assert.equal(cost(result,'second',5,{largura:90}).costCents,null);
});
test('future purchases never reprice an earlier exit and all cents survive partial exits',()=>{
 const a=buy('a',3,100,8),b=buy('b',1,10000,12),events=[a.row,move('x','saida',1,9,{grupoCargaId:'x'}),move('y','saida',1,10,{grupoCargaId:'y'}),move('z','saida',1,11,{grupoCargaId:'z'}),b.row];
 const result=projectWeightedStockCosts({purchases:[a.receipt,b.receipt],movements:events,stock:[{...physical(),volume:1}]});
 assert.equal(cost(result,'x',1).costCents,33);assert.equal(cost(result,'y',1).costCents,34);assert.equal(cost(result,'z',1).costCents,33);
 // The last withdrawal leaves no penny stranded in an empty inventory pool.
});
test('old stock without price keeps costs pending until the unknown pool is physically exhausted',()=>{
 const a=buy('a',1,10000,9),b=buy('b',1,20000,12),events=[move('old','entrada',1,8),a.row,move('x','saida',1,10,{grupoCargaId:'x'}),move('y','saida',1,11,{grupoCargaId:'y'}),b.row,move('z','saida',1,13,{grupoCargaId:'z'})];
 const result=projectWeightedStockCosts({purchases:[a.receipt,b.receipt],movements:events,stock:[]});assert.equal(cost(result,'x',1).costCents,null);assert.equal(cost(result,'y',1).costCents,null);assert.equal(cost(result,'z',1).costCents,20000);
 const opening=projectWeightedStockCosts({purchases:[a.receipt],movements:[a.row,move('x','saida',1,10,{grupoCargaId:'x'})],stock:[{...physical(),volume:1}]});assert.equal(cost(opening,'x',1).costCents,null);
});
test('transfers neither buy nor sell and dry, green, species and dimensions remain distinct',()=>{
 const a=buy('a',2,20000,8),g=buy('g',1,50000,8,{estadoMadeira:'verde',origemMovimentacao:'Mad. verde'}),wide=buy('w',1,60000,8,{largura:90}),events=[a.row,g.row,wide.row,move('t1','saida',1,9,{transferencia:true}),move('t2','entrada',1,9,{transferencia:true}),move('x','saida',1,10,{grupoCargaId:'x',origem:'Estoque 2'}),move('y','saida',1,11,{grupoCargaId:'y',estadoMadeira:'verde',origemMovimentacao:'Mad. verde'})];
 const result=projectWeightedStockCosts({purchases:[a.receipt,g.receipt,wide.receipt],movements:events,stock:[{...physical(),volume:1},{...physical({largura:90}),volume:1}]});assert.equal(cost(result,'x',1).costCents,10000);assert.equal(cost(result,'y',1,{estadoMadeira:'verde'}).costCents,50000);
});
test('missing or edited history, missing receipt marker and impossible balances do not invent a cost',()=>{
 const a=buy('a',2,20000,8),exit=move('x','saida',1,9,{grupoCargaId:'x'});
 for(const rows of [[exit],[{...a.row,volume:1},exit],[{...a.row,purchaseReceiptV728:null},exit],[a.row,{...exit,data:'inválida'}],[a.row,{...exit,volume:3}]]){
  const result=projectWeightedStockCosts({purchases:[a.receipt],movements:rows,stock:[{...physical(),volume:1}]});assert.equal(cost(result,'x',1).costCents,null);
 }
});
const opening={unitCents:100000,cutoffAt:Date.UTC(2026,10,8,15),revision:1};
test('R1000 old wood and R2000 new purchase form a real weighted mean, without replacing the new purchase cost',()=>{
 const a=buy('a',1,200000,9),events=[move('old','entrada',1,8),a.row,move('x','saida',1,10,{grupoCargaId:'x'})],before=JSON.stringify(events),result=projectWeightedStockCosts({openingPolicy:opening,purchases:[a.receipt],movements:events,stock:[{...physical(),volume:1}]});assert.equal(cost(result,'x',1).costCents,150000);assert.equal(JSON.stringify(events),before);assert.equal(a.receipt.lines[0].acquisitionCents,200000);
});
test('old valuation also covers a reconstructed opening balance, while later unpriced entries remain pending',()=>{
 const a=buy('a',1,200000,9),exit=move('x','saida',1,10,{grupoCargaId:'x'});let result=projectWeightedStockCosts({openingPolicy:opening,purchases:[a.receipt],movements:[a.row,exit],stock:[{...physical(),volume:1}]});assert.equal(cost(result,'x',1).costCents,150000);
 result=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:[move('old','entrada',1,8),move('new-unpriced','entrada',1,14),move('y','saida',1,15,{grupoCargaId:'y'})],stock:[{...physical(),volume:1}]});assert.equal(cost(result,'y',1).costCents,null);
});
test('old valuation works without a purchase receipt but does not cover granel or broken physical history',()=>{
 const events=[move('old','entrada',2,8),move('x','saida',1,10,{grupoCargaId:'x'})];const result=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:events,stock:[{...physical(),volume:1}]});assert.equal(cost(result,'x',1).costCents,100000);
 const broken=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:events,stock:[]});assert.equal(cost(broken,'x',1).costCents,null);
 const rows=events.map(e=>({...e,tipoMedida:'granel',largura:0,espessura:0,comprimento:0})),granel=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:rows,stock:[{...physical({tipoMedida:'granel',largura:0,espessura:0,comprimento:0}),volume:1}]});assert.equal(weightedCostForLoad([{...physical({tipoMedida:'granel'}),grupoCargaId:'x',volume:1}],granel).costCents,null);
});
test('old reconstructed balance is valued even if its first recorded exit occurs after the valuation was saved',()=>{
 const a=buy('new-after-cutoff',1,200000,13),events=[a.row,move('later','saida',1,14,{grupoCargaId:'later'})],result=projectWeightedStockCosts({openingPolicy:opening,purchases:[a.receipt],movements:events,stock:[{...physical(),volume:1}]});assert.equal(cost(result,'later',1).costCents,150000);
});
test('a recorded quick-conference adjustment supplies its own exit but is never an invented new purchase',()=>{
 const adjustment=move('adjust','ajuste',1,11,{grupoCargaId:'adjusted',ajusteConferenciaV390:true}),exit=move('adjusted-exit','saida',1,10,{grupoCargaId:'adjusted'}),before=JSON.stringify([adjustment,exit]);
 const result=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:[adjustment,exit],stock:[]});assert.equal(cost(result,'adjusted',1).costCents,100000);assert.equal(JSON.stringify([adjustment,exit]),before);
 const noPrice=projectWeightedStockCosts({purchases:[],movements:[adjustment,exit],stock:[]});assert.equal(cost(noPrice,'adjusted',1).costCents,null);
 const future=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:[{...adjustment,data:time(14)},{...exit,data:time(13)}],stock:[]});assert.equal(cost(future,'adjusted',1).costCents,null);
});
test('one nanounit of rounding in the reconstructed opening balance does not block a valid cost',()=>{
 const a=buy('round',2.0000000008,200000,8),exit=move('round-out','saida',1.0000000004,9,{grupoCargaId:'round-load'}),result=projectWeightedStockCosts({purchases:[a.receipt],movements:[a.row,exit],stock:[{...physical(),volume:1.0000000004}]});assert.equal(cost(result,'round-load',1.0000000004).costCents,100000);
});
test('old valuation does not hide a damaged purchase reference or a real stock shortage, and gives a concrete reason',()=>{
 const a=buy('safe',1,200000,8),out=move('safe-out','saida',1,9,{grupoCargaId:'safe-load'});
 for(const movements of [[{...a.row,purchaseReceiptV728:'wrong'},out],[{...a.row,data:time(10)},{...out,volume:2}]]){
  const result=projectWeightedStockCosts({openingPolicy:opening,purchases:[a.receipt],movements,stock:[]}),checked=cost(result,'safe-load',1);assert.equal(checked.costCents,null);assert(checked.reason.length>20);assert.match(checked.reason,/confere|fecham|supera/);
 }
 const missing=weightedCostForLoad([{...physical(),quantidade:1,grupoCargaId:'missing',volume:1}],new Map());assert.match(missing.reason,/movimento de saída/);
 const tooMany=Object.assign(new Map(),{unavailableReason:'Histórico acima do limite.'});assert.equal(weightedCostForLoad([{...physical(),quantidade:1,grupoCargaId:'x',volume:1}],tooMany).reason,'Histórico acima do limite.');
});

test('V391 physical conference is a recorded entry at its own time, not an unknown adjustment type',()=>{
 const adjustment=move('v391','ajuste',2,8,{grupoCargaId:'load-391',ajusteConferenciaV391:true}),exit=move('out-391','saida',1,9,{grupoCargaId:'load-391'}),before=JSON.stringify([adjustment,exit]);
 const result=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:[adjustment,exit],stock:[{...physical(),volume:1}]});
 assert.equal(cost(result,'load-391',1).costCents,100000);assert.equal(JSON.stringify([adjustment,exit]),before);
 // The real stock entry can be consumed by a later load, not only the one linked to the conference.
 const later=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:[adjustment,{...exit,grupoCargaId:'later-391'}],stock:[{...physical(),volume:1}]});assert.equal(cost(later,'later-391',1).costCents,100000);
});
test('new conference entries do not borrow the selling price or old valuation after cutoff',()=>{
 const adjustment=move('v391-new','ajuste',1,13,{grupoCargaId:'load-new',ajusteConferenciaV391:true,valor:99999}),exit=move('out-new','saida',1,14,{grupoCargaId:'load-new'});
 for(const policy of [{},opening]){const result=projectWeightedStockCosts({openingPolicy:policy,purchases:[],movements:[adjustment,exit],stock:[]}),checked=cost(result,'load-new',1);assert.equal(checked.costCents,null);assert.match(checked.reason,/ajuste de conferência acrescentou madeira sem custo/);}
 const unmarked=projectWeightedStockCosts({openingPolicy:opening,purchases:[],movements:[{...adjustment,ajusteConferenciaV391:false},exit],stock:[]});assert.match(cost(unmarked,'load-new',1).reason,/ajuste no histórico/);
});

test('owner rule: conference quantity inherits the known carrying cost without creating a purchase',()=>{
 const a=buy('basis',10,1300000,8),adjust=move('surplus','ajuste',2,13,{grupoCargaId:'conference',ajusteConferenciaV391:true,valor:999999}),out=move('sale-out','saida',4,14,{grupoCargaId:'sale'}),input={purchases:[a.receipt],movements:[a.row,adjust,out],stock:[{...physical(),volume:8}]},before=JSON.stringify(input);
 const result=projectWeightedStockCosts(input),checked=cost(result,'sale',4);assert.equal(checked.costCents,520000);assert.equal(checked.usesConferenceAverage,true);assert.equal(JSON.stringify(input),before);
 const b=buy('second-basis',10,1500000,10),mixed=projectWeightedStockCosts({purchases:[a.receipt,b.receipt],movements:[a.row,b.row,adjust,out],stock:[{...physical(),volume:18}]});assert.equal(cost(mixed,'sale',4).costCents,560000);
});
test('conference never borrows a future purchase, another species, or an unknown stock cost',()=>{
 const a=buy('future',1,130000,15),adjust=move('unpriced-adjust','ajuste',1,13,{grupoCargaId:'unpriced',ajusteConferenciaV391:true}),out=move('out-unpriced','saida',1,14,{grupoCargaId:'unpriced'});
 const future=projectWeightedStockCosts({purchases:[a.receipt],movements:[adjust,out,a.row],stock:[{...physical(),volume:1}]});assert.equal(cost(future,'unpriced',1).costCents,null);
 const b=buy('other',1,130000,8,{madeiraId:'other'}),other=projectWeightedStockCosts({purchases:[b.receipt],movements:[b.row,adjust,out],stock:[{...physical({madeiraId:'other'}),volume:1}]});assert.equal(cost(other,'unpriced',1).costCents,null);
 const unknown=projectWeightedStockCosts({purchases:[],movements:[move('unknown','entrada',1,8),adjust,out],stock:[{...physical(),volume:1}]});assert.equal(cost(unknown,'unpriced',1).costCents,null);
});
