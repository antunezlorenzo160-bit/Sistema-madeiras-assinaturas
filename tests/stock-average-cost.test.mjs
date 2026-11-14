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

test('an unpriced conference uses other measures as a weighted species/state reference at its recorded time',()=>{
 const a=buy('ref-a',10,1000000,8,{largura:10}),b=buy('ref-b',30,6000000,9,{largura:20}),adjust=move('new-measure','ajuste',4,10,{grupoCargaId:'new-measure',ajusteConferenciaV391:true,largura:30}),out=move('new-out','saida',4,11,{grupoCargaId:'new-measure',largura:30});
 const input={purchases:[a.receipt,b.receipt],movements:[a.row,b.row,adjust,out],stock:[{...physical({largura:10}),volume:10},{...physical({largura:20}),volume:30}]},before=JSON.stringify(input),checked=cost(projectWeightedStockCosts(input),'new-measure',4,{largura:30});
 assert.equal(checked.costCents,700000);assert.equal(checked.usesSpeciesReference,true);assert.equal(JSON.stringify(input),before);
 // Input array order must not change which historical reference is used.
 assert.equal(cost(projectWeightedStockCosts({...input,movements:[out,b.row,adjust,a.row]}),'new-measure',4,{largura:30}).costCents,700000);
});
test('species reference reflects earlier withdrawals, never future buys or movements at the same time',()=>{
 const a=buy('ref-low',10,1000000,8,{largura:10}),b=buy('ref-high',10,2000000,8,{largura:20}),future=buy('future-ref',100,90000000,12,{largura:40}),adjust=move('adjust-ref','ajuste',3,10,{grupoCargaId:'ref-sale',ajusteConferenciaV391:true,largura:30}),out=move('ref-sale','saida',3,11,{grupoCargaId:'ref-sale',largura:30}),oldOut=move('old-out','saida',5,9,{grupoCargaId:'old-sale',largura:10});
 const input={purchases:[a.receipt,b.receipt,future.receipt],movements:[a.row,b.row,oldOut,adjust,out,future.row],stock:[{...physical({largura:10}),volume:5},{...physical({largura:20}),volume:10},{...physical({largura:40}),volume:100}]};
 assert.equal(cost(projectWeightedStockCosts(input),'ref-sale',3,{largura:30}).costCents,500000);
 const same=buy('same-time',1,130000,10,{largura:10}),pending=projectWeightedStockCosts({purchases:[same.receipt],movements:[same.row,adjust,out],stock:[{...physical({largura:10}),volume:1}]});assert.equal(cost(pending,'ref-sale',3,{largura:30}).costCents,null);
});
test('exact measure cost wins over species reference, including when its stock was depleted',()=>{
 const own=buy('own',1,130000,8),other=buy('other-price',10,5000000,8,{largura:30}),empty=move('empty','saida',1,9,{grupoCargaId:'earlier'}),adjust=move('own-adjust','ajuste',2,10,{grupoCargaId:'own-sale',ajusteConferenciaV391:true}),out=move('own-out','saida',2,11,{grupoCargaId:'own-sale'});
 const checked=cost(projectWeightedStockCosts({purchases:[own.receipt,other.receipt],movements:[own.row,other.row,empty,adjust,out],stock:[{...physical({largura:30}),volume:10}]}),'own-sale',2);
 assert.equal(checked.costCents,260000);assert.equal(checked.usesSpeciesReference,false);
});
test('species reference never crosses dry/green or units, and is not used for an unpriced ordinary entry',()=>{
 const a=buy('dry-ref',10,1300000,8,{largura:10}),adjust=move('green-adjust','ajuste',1,10,{grupoCargaId:'green',ajusteConferenciaV391:true,estadoMadeira:'verde'}),out=move('green-out','saida',1,11,{grupoCargaId:'green',estadoMadeira:'verde'});
 assert.equal(cost(projectWeightedStockCosts({purchases:[a.receipt],movements:[a.row,adjust,out],stock:[{...physical({largura:10}),volume:10}]}),'green',1,{estadoMadeira:'verde'}).costCents,null);
 const ordinary=projectWeightedStockCosts({purchases:[a.receipt],movements:[a.row,{...adjust,tipo:'entrada',estadoMadeira:'seca'},{...out,estadoMadeira:'seca'}],stock:[{...physical({largura:10}),volume:10}]});assert.equal(cost(ordinary,'green',1).costCents,null);
});

test('a referenced adjustment enters the species average for later adjustments without inventing a purchase',()=>{
 const a=buy('chain-base',10,1300000,8,{largura:10}),b=move('chain-b','ajuste',5,9,{grupoCargaId:'chain-b',ajusteConferenciaV391:true,largura:20}),empty=move('empty-base','saida',10,10,{grupoCargaId:'empty-base',largura:10}),c=move('chain-c','ajuste',4,11,{grupoCargaId:'chain-c',ajusteConferenciaV391:true,largura:30}),out=move('chain-sale','saida',4,12,{grupoCargaId:'chain-sale',largura:30}),input={purchases:[a.receipt],movements:[a.row,b,empty,c,out],stock:[{...physical({largura:20}),volume:5}]};
 const checked=cost(projectWeightedStockCosts(input),'chain-sale',4,{largura:30});assert.equal(checked.costCents,520000);assert.equal(checked.usesSpeciesReference,true);
});
test('reference adjustments preserve cent totals across very small partial exits',()=>{
 const a=buy('small-ref',3,1,8,{largura:10}),adjust=move('small-adjust','ajuste',2,9,{grupoCargaId:'small-adjust',ajusteConferenciaV391:true,largura:20}),x=move('tiny-x','saida',1,10,{grupoCargaId:'tiny-x',largura:20}),y=move('tiny-y','saida',1,11,{grupoCargaId:'tiny-y',largura:20});
 const result=projectWeightedStockCosts({purchases:[a.receipt],movements:[a.row,adjust,x,y],stock:[{...physical({largura:10}),volume:3}]});const first=cost(result,'tiny-x',1,{largura:20}).costCents,second=cost(result,'tiny-y',1,{largura:20}).costCents;assert(first>=0&&second>=0);assert.equal(first+second,1);
});

test('a historical known species reference remains available after its physical balance was depleted',()=>{
 const a=buy('depleted-ref',10,1300000,8,{largura:10}),empty=move('deplete-ref','saida',10,9,{grupoCargaId:'old',largura:10}),adjust=move('later-measure','ajuste',2,10,{grupoCargaId:'new',ajusteConferenciaV391:true,largura:20}),out=move('later-out','saida',2,11,{grupoCargaId:'new',largura:20});
 const checked=cost(projectWeightedStockCosts({purchases:[a.receipt],movements:[a.row,empty,adjust,out],stock:[]}),'new',2,{largura:20});assert.equal(checked.costCents,260000);assert.equal(checked.usesSpeciesReference,true);
});

test('m² and linear costs follow physical units and keep products and units separate',()=>{
 const area={tipoMedida:'m2',largura:20,espessura:0,comprimento:3},metre={tipoMedida:'linear',largura:0,espessura:0,comprimento:0,produto:'Ripa',linearTotalV744:true},other={...metre,produto:'Rodapé'};
 const a=buy('area',12,30000,8,area),b=buy('metre',70,56000,8,metre),c=buy('other',70,140000,8,other);
 const projection=projectWeightedStockCosts({purchases:[a.receipt,b.receipt,c.receipt],movements:[a.row,b.row,c.row,move('out-area','saida',6,9,{...area,grupoCargaId:'area-sale'}),move('out-metre','saida',20,9,{...metre,grupoCargaId:'metre-sale'}),move('out-other','saida',10,9,{...other,grupoCargaId:'other-sale'})],stock:[{...physical(area),volume:6},{...physical(metre),volume:50},{...physical(other),volume:60}]});
 assert.equal(weightedCostForLoad([{...physical(area),quantidade:10,volume:6,grupoCargaId:'area-sale'}],projection).costCents,15000);
 assert.equal(weightedCostForLoad([{...physical(metre),quantidade:0,volume:20,volumeReal:20,metrosCobrados:25,grupoCargaId:'metre-sale'}],projection).costCents,16000);
 assert.equal(weightedCostForLoad([{...physical(other),quantidade:0,volume:10,grupoCargaId:'other-sale'}],projection).costCents,20000);
 assert.notEqual(stockCostKey(physical(metre)),stockCostKey(physical(other)));assert.notEqual(stockCostKey(physical(area)),stockCostKey(physical()));
});
