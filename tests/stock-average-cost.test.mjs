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
