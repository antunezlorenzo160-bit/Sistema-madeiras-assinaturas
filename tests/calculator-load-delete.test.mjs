import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {applyCalculatorLoadDelete} from '../scripts/calculator-load-delete.mjs';
const draft=(id,group='current')=>({id,grupoCargaId:group,cargaFluxoV388:true,cargaStatus:'montagem',destino:'carga'});
function setup(items,visible=items){
 const calls={queue:[],pc:0,render:0,alerts:[],saved:0};
 const c={carregamentos:structuredClone(items),lancamentos:structuredClone(visible),sessaoCargaAtual:'current',contadorPacotes:7,sessaoPacotes:'old',COL:{cargas:'loads'},crypto:{randomUUID:()=> 'next'},confirm:()=>true,alert:m=>calls.alerts.push(m),exigirEscritaPlano(){},document:{getElementById:()=>null},window:{statusEfetivoCargaV589:x=>x.cargaStatus,__v456Local:{setItem(){}}},enfileirarOffline:(...a)=>calls.queue.push(a),save:()=>calls.saved++,sincronizarOfflineOps:async()=>{},salvarContador(){},renderLancamentosV387:()=>calls.render++,atualizarFluxoCargaV388(){},atualizarPainelPacotes(){},calcPreview(){},pcAtualizarPlanilhaDirecionada:()=>calls.pc++};
 c.itensGrupoCargaV388=(g,status)=>c.carregamentos.filter(x=>x.cargaFluxoV388&&x.grupoCargaId===g&&x.cargaStatus===status);
 c.itensCargaAtualV388=()=>c.itensGrupoCargaV388(c.sessaoCargaAtual,'montagem');
 c.ocultarDoResumo=async ids=>{c.lancamentos=c.lancamentos.filter(x=>!ids.includes(x.id));};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/delete-calculator-load.js',import.meta.url),'utf8'),c);return {c,calls};
}
test('deletes current draft, persists offline deletion and refreshes mobile/desktop counters',async()=>{const {c,calls}=setup([draft('a'),draft('b','saved')],[draft('a'),{id:'stock',destino:'estoque1'}]);await c.apagarCargaAtualV388();assert.deepEqual(c.carregamentos.map(x=>x.id),['b']);assert.deepEqual(c.lancamentos.map(x=>x.id),['stock']);assert.equal(calls.queue.length,1);assert.equal(calls.queue[0][3],'delete');assert.equal(c.contadorPacotes,0);assert.equal(calls.pc,1);assert.equal(calls.render,1);assert.equal(c.sessaoCargaAtual,'next');});
test('restored summary resolves displayed draft when session id differs',async()=>{const {c}=setup([draft('a','restored')]);await c.apagarCargaAtualV388();assert.equal(c.carregamentos.length,0);assert.equal(c.lancamentos.length,0);});
test('closed load is only removed from summary, preserving saved load and stock',async()=>{const closed={...draft('a','closed'),cargaStatus:'concluido'};const {c,calls}=setup([closed],[closed,{id:'stock',destino:'estoque1'}]);await c.apagarCargaAtualV388();assert.equal(c.carregamentos.length,1);assert.equal(calls.queue.length,0);assert.equal(c.lancamentos[0].id,'stock');});
test('cancel and blocked access leave all records intact',async()=>{for(const blocked of [false,true]){const {c,calls}=setup([draft('a')]);c.confirm=()=>false;if(blocked)c.exigirEscritaPlano=()=>{throw Error('blocked')};if(blocked)await assert.rejects(c.apagarCargaAtualV388());else await c.apagarCargaAtualV388();assert.equal(c.carregamentos.length,1);assert.equal(calls.queue.length,0);assert.equal(calls.saved,0);}});
test('ambiguous restored groups require choosing a load and never bulk delete',async()=>{const {c,calls}=setup([draft('a','x'),draft('b','y')]);await c.apagarCargaAtualV388();assert.equal(calls.alerts.length,1);assert.equal(calls.queue.length,0);});
test('build replacement is repeatable and refuses unknown source',()=>{const source='async function apagarCargaAtualV388(){return;}\n  function garantirPainelCargaV388(){}';const next=applyCalculatorLoadDelete(source);assert.equal(applyCalculatorLoadDelete(next),next);assert.throws(()=>applyCalculatorLoadDelete(''));});
