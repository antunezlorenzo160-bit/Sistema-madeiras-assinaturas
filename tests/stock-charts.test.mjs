import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateChartInventory,aggregateChartMovements,stockChartMovementDay,stockChartPeriods,stockChartName} from '../public/stock-charts.mjs';
const options={stock:'estoque1',kind:'m3',from:'2026-11-01',to:'2026-11-07'};
const movement=(more={})=>({origem:'Estoque 1',tipoCadastro:'m3',madeira:'Garapeira',data:'03/11/2026, 09:00:00',tipo:'entrada',volume:1,...more});
test('daily chart fills empty days and separates transfers and adjustments without changing data',()=>{
 const input=[movement({volume:3}),movement({tipo:'saida',volume:-1}),movement({tipo:'entrada',transferencia:true,volume:2}),movement({tipo:'saida',transferencia:true,volume:4}),movement({tipo:'ajuste',volume:500}),movement({tipo:'secagem_confirmada',volume:10}),movement({origem:'Estoque 2',volume:99}),movement({tipoCadastro:'m2',volume:99}),movement({data:'31/10/2026',volume:99})].map(Object.freeze),before=JSON.stringify(input);
 const chart=aggregateChartMovements(input,options);assert.equal(chart.periods.length,7);assert.deepEqual(chart.totals,{in:3,out:1,transferIn:2,transferOut:4,otherCount:2});assert.equal(chart.periods[2].in,3);assert.equal(chart.periods[0].in,0);assert.equal(JSON.stringify(input),before);
});
test('monthly totals respect partial months and original event date rather than sync timestamp',()=>{
 const items=[movement({data:'31/10/2026',volume:2}),movement({data:'01/11/2026',volume:3}),movement({data:'05/11/2026',volume:4}),movement({data:'06/11/2026',volume:99}),movement({data:'30/10/2026',volume:99})];
 const chart=aggregateChartMovements(items,{...options,from:'2026-10-31',to:'2026-11-05',group:'month'});assert.deepEqual(chart.periods.map(r=>[r.key,r.in]),[['2026-10',2],['2026-11',7]]);
 assert.equal(stockChartMovementDay({...items[0],atualizadoEm:Date.UTC(2026,11,20)}),'2026-10-31');
});
test('invalid dates and amounts are reported, never silently turned into a valid period',()=>{
 const chart=aggregateChartMovements([movement({data:'31/11/2026'}),movement({data:'',atualizadoEm:0}),movement({volume:'bad'}),movement({volume:null}),movement({volume:''}),movement({volume:undefined})],options);
 assert.equal(chart.excluded.undated,2);assert.equal(chart.excluded.invalidVolume,4);assert.equal(chart.totals.in,0);
 assert.equal(stockChartMovementDay(movement({data:'bad',atualizadoEm:Date.UTC(2026,10,5)})),null);
});
test('date limits handle leap days and reject reversed or excessively large daily ranges',()=>{
 assert.equal(stockChartPeriods('2024-02-28','2024-03-01').length,3);assert.throws(()=>stockChartPeriods('2026-02-29','2026-03-01'));assert.throws(()=>stockChartPeriods('2026-11-05','2026-11-01'));assert.throws(()=>stockChartPeriods('2026-01-01','2026-12-31'),/mês/);assert.equal(stockChartPeriods('2026-01-01','2026-12-31','month').length,12);
});
test('current stock uses remaining physical rows and separates green wood, preserving negative balances',()=>{
 const input=[{madeira:'Garapeira',volume:1.2,quantidade:99},{madeira:'Garapeira',volume:.3,estadoMadeira:'verde'},{madeira:'Garapeira',volume:.2},{madeira:'Garrote',volume:-.1},{madeira:'Deck',tipoMedida:'m2',volume:200}].map(Object.freeze),before=JSON.stringify(input);
 const stock=aggregateChartInventory(input);assert.equal(stock.rows.length,2);assert(Math.abs(stock.totals.total-1.6)<1e-10);assert.equal(stock.rows[0].green,.3);assert.equal(stock.rows[1].total,-.1);assert.equal(JSON.stringify(input),before);
});
test('units and species filters never mix cubic, square, linear and bulk stock or movement',()=>{
 for(const kind of ['m3','m2','linear','granel']){
  const stock=aggregateChartInventory([{madeira:'A',tipoMedida:kind,volume:5},{madeira:'B',tipoMedida:kind,volume:99},{madeira:'A',tipoMedida:kind==='m3'?'m2':'m3',volume:100}],{kind,species:'A'});assert.equal(stock.totals.total,5);
  const history=aggregateChartMovements([movement({madeira:'A',tipoCadastro:kind,volume:3}),movement({madeira:'B',tipoCadastro:kind,volume:50})],{...options,kind,species:'A'});assert.equal(history.totals.in,3);
 }
 assert.equal(stockChartName({especie:'Pinus',produto:'Forro',qualidade:'A'}),'Pinus — Forro — A');
});
