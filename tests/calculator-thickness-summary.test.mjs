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
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.ok(html.includes('calculator-thickness-summary-v1'));assert.equal(applyCalculatorThicknessSummary(html),html);const x=item(3,.1,8,'<Pinus>');const row=c.linhaTotalEspessuraResumo(c.totaisEspessuraResumo([x]),c.chaveBlocoResumoV598(x),6);assert.match(row,/&lt;Pinus>/);assert.doesNotMatch(row,/R\$/);assert.throws(()=>applyCalculatorThicknessSummary(''));
});
