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
