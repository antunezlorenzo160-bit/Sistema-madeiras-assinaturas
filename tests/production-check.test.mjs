import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {productionCheckSummary} from '../public/production-check.mjs';
import {productionProjection} from '../Netlify/Funtions/lib/production-access.mjs';
const order=()=>({id:'o',status:'confirmado',itens:[{id:'pin',quantidade:12}],materiaisUsadosProducao:{pin:'[ 12 × 30 × 5 ]'},total:190});
test('finishing production or filling material does not imply conference',()=>{const o=order();o.producaoFinalizadaEm=123;assert.equal(productionCheckSummary(o).conferido,false);assert.equal(productionCheckSummary(o).parcial,false);});
test('successful launches persist conference without recording stock deduction or altering commercial data',()=>{
 const c={window:{__v456Local:{setItem(){}}},orcamentosGuardados:[order()],pedidoProducaoDados:o=>o,employeeLoadActor:()=>({name:'Responsável'}),boundV456:{uid:'owner'},COL:{orcamentosGuardados:'orders'},STORAGE:{orcamentosGuardados:'orders'},enfileirarOffline:(...v)=>c.writes.push(v),sincronizarOfflineOps:async()=>{},writes:[]};vm.createContext(c);vm.runInContext(readFileSync(new URL('../public/production-check.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../ui/production-check.js',import.meta.url),'utf8'),c);
 const meta={pedidoId:'o',itemIndex:0,linhaIndex:0,totalLinhasConferencia:2};c.registrarConferenciaMaterialAposLancamento(meta,{id:'launch1',destino:'carga'});assert.equal(productionCheckSummary(c.orcamentosGuardados[0]).conferido,false);assert(productionCheckSummary(c.orcamentosGuardados[0]).parcial);
 c.registrarConferenciaMaterialAposLancamento({...meta,linhaIndex:1},{id:'launch2',destino:'carga'});assert(productionCheckSummary(c.orcamentosGuardados[0]).conferido);assert.equal(c.orcamentosGuardados[0].total,190);assert(!c.orcamentosGuardados[0].baixasProducaoV362);assert.equal(c.writes.length,2);
 const projected=productionProjection(c.orcamentosGuardados[0],'o');assert(projected.conferenciaMaterialProducao.conferido);assert(!JSON.stringify(projected).includes('conferidoPorUid'));assert(!JSON.stringify(projected).includes('total'));
 c.orcamentosGuardados[0].materiaisUsadosProducao.pin='[ 15 × 30 × 5 ]';assert(!productionCheckSummary(c.orcamentosGuardados[0]).conferido);
});
