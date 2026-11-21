import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {volumeToras,agruparToras,nomeFormulaTorasV786} from '../public/toras.mjs';
test('selectable circular and D-squared methods produce0.4241and0.5400for30cmby6m, retaining legacy exact arithmetic',()=>{
 assert.equal(volumeToras(30,6).unitario,Math.PI*(30/100)**2/4*6);assert.equal(volumeToras(30,6,1,'cilindrica').unitario.toFixed(4),'0.4241');assert.equal(volumeToras(30,6,1,'diametro_quadrado').unitario.toFixed(4),'0.5400');assert.equal(volumeToras(30,6,2,'diametro_quadrado').total,1.08);
 for(const value of ['other','',null,0,{}])assert.throws(()=>volumeToras(30,6,1,value));
});
test('different methods never merge; legacy and explicit circular methods remain compatible without changing source rows',()=>{
 const base={especie:'Pinus',diametro:30,comprimento:6,quantidade:1};const rows=[{...base,id:'legacy'},{...base,id:'round',formula:'cilindrica'},{...base,id:'square',formula:'diametro_quadrado'}],before=JSON.stringify(rows),groups=agruparToras(rows);assert.equal(groups.length,2);assert.equal(groups[0].quantidade,2);assert.equal(groups[1].quantidade,1);assert.equal(groups[1].formula,'diametro_quadrado');assert.equal(JSON.stringify(rows),before);assert.match(nomeFormulaTorasV786(groups[1].formula),/sem π/);
});
test('selector, saved line method, per-row labels and copied/PDF description are connected in the calculator source',()=>{
 const source=readFileSync(new URL('../public/toras.mjs',import.meta.url),'utf8');assert(source.includes('<select id="toraFormulaV786">'));assert(source.includes("quantidade, formula }"));assert(source.includes("el('torasMetodoV786').textContent='Método(s): '"));assert(source.includes("nomeFormulaTorasV786(l.formula)"));assert(source.includes("volumeToras(l.diametro, l.comprimento, l.quantidade, l.formula)"));assert(source.includes("formula=formulaTorasV786(el('toraFormulaV786').value)"));
});

import vm from 'node:vm';
test('mixed old module cache cannot silently price the square method with a circular-only calculator',()=>{
 const ctx={volumeToras:(d,l,q)=>volumeToras(d,l,q),chaveEspecieToras:()=> 'pinus',normalizePurchasePaymentV757(){}};vm.createContext(ctx);vm.runInContext(readFileSync(new URL('../public/log-purchase.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ',''),ctx);
 const input={companyId:'tenant',id:'8a58eaf9-6084-4bb0-b68e-062fcf477f4b',date:'2026-11-17',supplier:'Fornecedor',reference:'',freightCents:0,otherCents:0,freightIncluded:false,otherIncluded:false,lines:[{id:'b28dedf2-646b-4981-b7ae-0de09b5ed6bd',especie:'Pinus',diametro:30,comprimento:6,quantidade:1,unitCents:100000,formula:'diametro_quadrado'}]};
 assert.throws(()=>ctx.normalizeLogPurchaseV756(input),/atualize a página/);
});
