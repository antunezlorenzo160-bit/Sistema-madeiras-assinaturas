import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {applyCalculatorThicknessSummary} from '../scripts/calculator-thickness-summary.mjs';
const c={Map,Number,JSON,String,esc:s=>String(s).replaceAll('<','&lt;'),numCm:n=>String(n).replace('.',','),num4:n=>n.toFixed(4).replace('.',','),chaveBlocoResumoV598:x=>JSON.stringify([x.madeira,x.espessura,x.comprimento])};
vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/thickness-summary.js',import.meta.url),'utf8'),c);
const item=(comp,volume,espessura=8,madeira='Garapeira',tipoMedida='m3')=>({comprimento:comp,volume,espessura,madeira,tipoMedida});
test('sums all widths and lengths for each species/thickness, matching screenshot 1.4304 m³',()=>{
 const items=[item(3.5,.028),item(3.5,.056),item(4,.0384),item(4,.048),item(4.5,.27),item(4.5,.288),item(4.5,.09),item(4.5,.072),item(5,.32),item(5,.1),item(5,.12)];const totals=c.totaisEspessuraResumo(items);for(const x of items.slice(0,8))assert.equal(c.linhaTotalEspessuraResumo(totals,c.chaveBlocoResumoV598(x),6),'');const html=c.linhaTotalEspessuraResumo(totals,c.chaveBlocoResumoV598(items.at(-1)),6);assert.match(html,/1,4304 m³/);assert.match(html,/8 cm/);
});
test('keeps species and thickness distinct and excludes m²/linear/bulk or missing thickness',()=>{
 const items=[item(3,.1),item(4,.2,4),item(5,.3,8,'Pinus'),item(3,999,8,'Garapeira','m2'),item(3,999,8,'Garapeira','linear'),item(3,999,8,'Garapeira','granel'),item(3,999,0)];const totals=c.totaisEspessuraResumo(items);assert.equal(totals.size,3);for(const [x,total] of [[items[0],.1],[items[1],.2],[items[2],.3]])assert.match(c.linhaTotalEspessuraResumo(totals,c.chaveBlocoResumoV598(x),6),new RegExp(c.num4(total)));
 assert.equal(c.totaisEspessuraResumo([]).size,0);
});
test('builder includes live subtotal in render function, escapes species and is repeatable',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.ok(html.includes('calculator-thickness-summary-v1'));const start=html.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}const app=JSON.parse(html.slice(start,end));assert.equal(applyCalculatorThicknessSummary(app),app);const x=item(3,.1,8,'<Pinus>');const row=c.linhaTotalEspessuraResumo(c.totaisEspessuraResumo([x]),c.chaveBlocoResumoV598(x),6);assert.match(row,/&lt;Pinus>/);assert.doesNotMatch(row,/R\$/);assert.throws(()=>applyCalculatorThicknessSummary(''));
});

vm.runInContext(readFileSync(new URL('../ui/thickness-grouping.js',import.meta.url),'utf8'),c);
test('alternating 5/8/5 cm stays together across lengths and repeats no subtotal',()=>{
 const items=[item(3,.1,5),item(3,.2,8),item(4,.3,5),item(3,.4,5),item(4,.5,8)];
 const ordered=c.organizarBlocosResumoV598(items);
 assert.deepEqual(Array.from(ordered,x=>x.espessura),[5,5,5,8,8]);
 assert.deepEqual(Array.from(ordered,x=>x.comprimento),[3,3,4,3,4]);
 const totals=c.totaisEspessuraResumo(ordered);let html='',previous='';
 for(const x of ordered){const block=c.chaveBlocoResumoV598(x);if(previous&&previous!==block)html+=c.linhaTotalEspessuraResumo(totals,previous,6);previous=block;}
 html+=c.linhaTotalEspessuraResumo(totals,previous,6);
 assert.equal((html.match(/resumo-total-espessura/g)||[]).length,2);
 assert.match(html,/0,8000 m³/);assert.match(html,/0,7000 m³/);
 assert.deepEqual(items.map(x=>x.espessura),[5,8,5,5,8]);
});
test('reverse order and switching species preserve first appearance within each species',()=>{
 const ordered=c.organizarBlocosResumoV598([item(3,.1,8),item(4,.2,5),item(3,.3,8,'Pinus'),item(5,.4,8),item(4,.5,5,'Pinus')]);
 assert.deepEqual(Array.from(ordered,x=>[x.madeira,x.espessura]),[['Garapeira',8],['Garapeira',8],['Garapeira',5],['Pinus',8],['Pinus',5]]);
});
