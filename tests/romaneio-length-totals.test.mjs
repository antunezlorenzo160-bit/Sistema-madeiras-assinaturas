import test from 'node:test';import assert from 'node:assert/strict';import {compactLoadGroups,projectCompactLoadGroups,paginateCompactGroups} from '../public/compact-load-tables.mjs';import {applyRomaneioTotalsV789} from '../scripts/romaneio-totals-build.mjs';
const headers=['pç','medidas','comp.','m³','m² face','m linear','Peso est.'];
const table=(length,volume,subtotal)=>({title:'Itaúba — Esp. 2,5 cm — Comp. '+length+' m',headers,subtotal:'Volume total do bloco: '+subtotal+' m³',physicalTotals:{m3:volume,m2:12,ml:30},rows:[['2','2,5 × 12 cm',length+' m',subtotal+' m³','12,0000 m²','30,00 m','—']]});
test('romaneio adds one descriptive total per length, keeps all physical rows and uses original precision for the thickness aggregate',()=>{
 const input=[table('2,5',1.00006,'1,0001'),table('3,5',2.12356,'2,1236')],before=JSON.stringify(input),groups=compactLoadGroups(input,{lengthTotals:true});
 assert.equal(groups.length,1);assert.match(groups[0].totals[0],/Comp\. 2,5 m: 1,0001 m³/);assert.match(groups[0].totals[1],/Comp\. 3,5 m: 2,1236 m³/);assert.match(groups[0].totals[2],/3,1236 m³/);assert(!groups[0].totals[2].includes('3,1237 m³'));assert.match(groups[0].totals[2],/Peso: não informado/);
 assert.equal(groups[0].totalsHeading,'Totais por espécie, espessura e comprimento');const projected=projectCompactLoadGroups(groups);assert.equal(projected[0].rows.length,2);assert.equal(paginateCompactGroups(projected).flat(2).flatMap(g=>g.rows).length,2);assert.equal(JSON.stringify(input),before);
});
test('legacy print tables retain their own saved subtotals and ordinary load grouping stays unchanged',()=>{
 const input=[table('2,5',1,'1,0000'),table('3,5',2,'2,0000')];for(const row of input)delete row.physicalTotals;
 const regular=compactLoadGroups(input);assert.equal(regular[0].totals.length,1);const romaneio=compactLoadGroups(input,{lengthTotals:true});assert.equal(romaneio[0].totals.length,3);assert.match(romaneio[0].totals[2],/3,0000 m³/);
});
test('precise metrics are embedded only in the romaneio table and the build remains repeatable',()=>{
 const source='  function blocoRomaneioV418(g){const metricas={m3:1,m2:2,ml:3};return `<table class="v404-carga-tabela">`;}\n  function documentoRomaneioV418(gid){}';const next=applyRomaneioTotalsV789(source);assert(next.includes('data-physical-totals-v789="${esc(JSON.stringify(metricas))}"'));assert.equal(applyRomaneioTotalsV789(next),next);assert.throws(()=>applyRomaneioTotalsV789('unknown'));
});
