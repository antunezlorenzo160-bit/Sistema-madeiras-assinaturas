import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {compactLoadGroups} from '../public/compact-load-tables.mjs';
const rows=JSON.parse(readFileSync(new URL('./fixtures/romaneio75.json',import.meta.url),'utf8'));
const tables=rows.map(r=>({title:`${r.species} — Esp. ${r.thickness} cm — Comp. ${r.length} m`,headers:['pç','medidas','comp.','m³','m² face','m linear','Peso est.'],rows:[[r.quantity,`${r.thickness} × ${r.width} cm`,r.length+' m',r.m3+' m³',r.m2+' m²',r.linear+' m',r.weight]]}));
test('actual75-line romaneio groups across lengths into3species/thickness tables, not paragraphs',()=>{
 const out=compactLoadGroups(tables);assert.equal(out.length,3);assert(out.every(g=>!g.title.includes('Comp.')));
 assert.equal(out.flatMap(g=>g.rows).length,75);assert.equal(out.flatMap(g=>g.rows).reduce((s,r)=>s+Number(r[0]),0),451);
 assert.deepEqual(out[0].headers,['pç','Larg. cm','Comp. m','m³','m² face','m linear','Peso kg']);
 const expected=rows.map(r=>[r.quantity,r.width,r.length,r.m3,r.m2,r.linear,r.weight]);assert.deepEqual(out.flatMap(g=>g.rows),expected);
});
test('input cells, weights, unknown dimensions and financial fields are never recalculated or discarded',()=>{
 const data=[{title:'Madeira — Esp. 5 cm — Comp. 3 m',headers:['pç','medidas','comp.','Valor'],rows:[['2','Largura não informada','3,0 m','R$ 1.234,56']]}];const before=JSON.stringify(data);const out=compactLoadGroups(data);assert.equal(JSON.stringify(data),before);assert.equal(out[0].rows[0][1],'Largura não informada');assert.equal(out[0].rows[0][3],'R$ 1.234,56');
 assert.throws(()=>compactLoadGroups([{title:'Itens',headers:['Pç','m³'],rows:[['1']]}]));
});

import {projectCompactLoadGroups,paginateCompactGroups} from '../public/compact-load-tables.mjs';
test('approved compact romaneio has five columns with explicit thickness; detailed option preserves seven',()=>{
 const source=compactLoadGroups(tables);const out=projectCompactLoadGroups(source);
 assert.deepEqual(out[0].headers,['Pç','Esp. cm','Larg. cm','Comp. m','Volume m³']);
 assert.deepEqual(out.flatMap(g=>g.rows),rows.map(r=>[r.quantity,r.thickness,r.width,r.length,r.m3]));
 assert.deepEqual(projectCompactLoadGroups(source,true).flatMap(g=>g.rows),source.flatMap(g=>g.rows));
});
test('75-line fixture is explicitly balanced on one sheet with continuation title, no CSS multicol',()=>{
 const groups=projectCompactLoadGroups(compactLoadGroups(tables));const pages=paginateCompactGroups(groups);
 assert.equal(pages.length,1);assert.equal(pages[0].length,2);
 const flat=pages.flat(2).flatMap(g=>g.rows);assert.deepEqual(flat,groups.flatMap(g=>g.rows));
 assert(pages[0][1][0].continued);assert(pages[0].every(col=>col.reduce((n,g)=>n+g.rows.length+2,0)<=44));
});
test('large documents paginate without losing or duplicating rows; totals remain outside repeated chunks',()=>{
 const group={title:'Madeira',headers:['Pç'],rows:Array.from({length:300},(_,i)=>[String(i)])};
 const pages=paginateCompactGroups([group]);assert(pages.length>1);assert.deepEqual(pages.flat(2).flatMap(g=>g.rows),group.rows);
});

import {samePrintMetricTotals} from '../public/compact-load-tables.mjs';
test('thickness descriptions stay unchanged and gain face area, linear meters and unavailable weight',()=>{
 const groups=compactLoadGroups(tables);
 const text=groups[0].totals[0];assert.match(text,/^Garapeira — Esp\. 5 cm:/);assert(!text.includes('Total da espessura'));
 assert.match(text,/Área de face: [\d,.]+ m²/);assert.match(text,/Metros lineares: [\d,.]+ m/);assert.match(text,/Peso: não informado/);
 const data=[{title:'Madeira — Esp. 5 cm',headers:['pç','m² face','m linear','Peso est.'],rows:[['1','2,5000 m²','3,00 m','10,0 kg'],['1','1,0000 m²','2,00 m','—']]}];
 assert.match(compactLoadGroups(data)[0].totals[0],/Área de face: 3,5000 m² · Metros lineares: 5,00 m · Peso: 10,0 kg \(parcial\)/);
});
test('global footer is duplicate despite unit suffixes, but different or incomplete metrics remain',()=>{
 const top=['451','15,4392 m³','222,8640 m²','1.639,00 m','Não informado'];
 assert(samePrintMetricTotals(top,['451','15,4392','222,8640','1.639,00','Não informado']));
 assert(!samePrintMetricTotals(top,['451','15,4393','222,8640','1.639,00','Não informado']));
 assert(!samePrintMetricTotals([],[]));assert(!samePrintMetricTotals(top,top.slice(0,-1)));
});
