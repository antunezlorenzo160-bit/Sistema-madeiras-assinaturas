import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {planInconsistentLoadArchive} from '../public/archive-inconsistent-load.mjs';
import {applyInconsistentLoadArchive} from '../scripts/archive-inconsistent-load-build.mjs';
const loads=[{id:'a',grupoCargaId:'test',quantidade:7,volume:0.7,cargaStatus:'aguardando_conferencia',cargaFechadaEm:1},{id:'b',grupoCargaId:'test',quantidade:3,volume:0.3,cargaStatus:'concluido',cargaBaixadaEm:2},{id:'other',grupoCargaId:'customer',quantidade:50,volume:5,cargaStatus:'montagem'}];
test('archive adds metadata only to the selected group and retains original statuses, quantities and history',()=>{
 const original=structuredClone(loads),plan=planInconsistentLoadArchive(loads,loads,'test','owner',100);
 assert.deepEqual(loads,original);assert.deepEqual(plan.loads[2],loads[2]);assert.equal(plan.summary.length,1);
 for(let i=0;i<2;i++){const row={...plan.loads[i]};for(const k of ['cargaArquivadaInconsistenteEm','cargaArquivadaPorUid','cargaArquivadaMotivo','atualizadoEm'])delete row[k];assert.deepEqual(row,loads[i]);}
 assert.equal(plan.operations.length,2);assert(plan.operations.every(x=>x.modo==='merge'&&!('quantidade' in x.obj)&&!('volume' in x.obj)&&!('cargaStatus' in x.obj)));
 assert.equal(planInconsistentLoadArchive(plan.loads,plan.summary,'test','owner',101).alreadyArchived,true);
});
test('invalid or missing targets cannot archive another group',()=>{
 for(const [group,actor]of [['missing','owner'],['test',''],['','owner']])assert.throws(()=>planInconsistentLoadArchive(loads,loads,group,actor,100));
});
test('employee and cancellation never persist or change the selected load',async()=>{
 for(const blocked of [true,false]){
  let writes=0;const context={window:{__smLoadDeductionJournal:{recover:()=>false}},employeeRequireLoadAdmin(){if(blocked)throw Error('admin only');},exigirEscritaPlano(){},employeeLoadActor:()=>({uid:'owner'}),planInconsistentLoadArchive,carregamentos:structuredClone(loads),lancamentos:structuredClone(loads),confirm:()=>false,alert(){},Date};
  context.window.__smLoadDeductionJournal.commit=()=>writes++;
  vm.createContext(context);vm.runInContext(readFileSync(new URL('../ui/archive-inconsistent-load.js',import.meta.url),'utf8'),context);await context.window.arquivarCargaInconsistenteV1('test');
  assert.equal(writes,0);assert.equal(context.carregamentos[0].cargaArquivadaInconsistenteEm,undefined);
 }
});
test('build keeps archived loads out of active statuses and blocks repeated stock deduction',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');const built=applyInconsistentLoadArchive(html);assert.equal(applyInconsistentLoadArchive(built),built);
 assert(built.includes('Arquivar teste com inconsistência'));assert(built.includes('Arquivado • inconsistência'));
 const start=built.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<built.length;end++){if(built[end]==='\\'){end++;continue;}if(built[end]==='"'){end++;break;}}
 const app=JSON.parse(built.slice(start,end)),a=app.indexOf('window.statusEfetivoCargaV589=function(x){'),b=app.indexOf('\n};',a)+3,context={window:{}};
 vm.runInNewContext(app.slice(a,b),context);
 assert.equal(context.window.statusEfetivoCargaV589({cargaBaixadaEm:2,cargaFechadaEm:1,cargaArquivadaInconsistenteEm:3}),'arquivado_inconsistente');
 assert.equal(context.window.statusEfetivoCargaV589({cargaFechadaEm:1}),'aguardando_conferencia');
});
