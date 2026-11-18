import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {loadCompletionMessageV792,offlineQueueStateV792} from '../public/offline-sync-state.mjs';
import {applyLoadCompletionV792,applyOfflineSyncStateV792} from '../scripts/load-completion-build.mjs';
const original=readFileSync(new URL('./fixtures/load-completion-v791.js',import.meta.url),'utf8');
function setup(){
 const calls={deductions:0,flushes:0,alerts:[],renders:0,sync:0},row={id:'a',grupoCargaId:'g',quantidade:3,volume:0.144,cargaFluxoV388:true,cargaStatus:'aguardando_conferencia'};
 let queue=[];const c={Set,Map,Date,Array,Number,String,console,baixasEmCurso:new Set(),isLinearTotalV744:()=>false,nomeUsuarioCargaV388:()=> 'admin',employeeLoadActor:()=>({uid:'user'}),iniciarMutacaoCargaV396(){},finalizarMutacaoCargaV396(){},carregamentos:[row],lancamentos:[row],estoque1Lancamentos:[],estoque2Lancamentos:[],salvarCargaComBaixaV387:async saved=>{calls.deductions++;c.carregamentos=[saved];queue=[{nome:'loads',id:saved.id,obj:saved,modo:'set'}];},save(){},window:{__v456Local:{flush:async()=>{calls.flushes++;},setItem(){}}},sincronizarOfflineOps:()=>{calls.sync++;return new Promise(()=>{});},offlineOps:()=>queue,loadCompletionMessageV792,writeBatch:()=>{throw Error('must not create metadata-only rows');},renderPlanilhasM3Especies:()=>calls.renders++,atualizarFluxoCargaV388(){},fecharModalAjusteRapidoV390(){},alert:text=>calls.alerts.push(text)};
 vm.createContext(c);vm.runInContext(applyLoadCompletionV792(original),c);return {c,calls,row};
}
test('local deduction completes and is acknowledged after durable flush even when the network never answers',async()=>{
 const {c,calls,row}=setup();await c.executarBaixaConferidaCargaV390('g',[row]);
 assert.equal(calls.deductions,1);assert.equal(calls.flushes,1);assert.equal(calls.sync,1);assert.equal(calls.renders,1);assert.equal(calls.alerts.length,1);assert.match(calls.alerts[0],/Salvo neste aparelho/);assert.match(calls.alerts[0],/Não repita/);assert.equal(c.carregamentos[0].volume,0.144);assert.equal(c.carregamentos[0].cargaStatus,'concluido');assert.equal(c.lancamentos.length,0);assert.equal(c.baixasEmCurso.size,0);
});
test('failed final local persistence does not acknowledge completion',async()=>{
 const {c,calls,row}=setup();c.window.__v456Local.flush=async()=>{throw Error('disk failed');};await c.executarBaixaConferidaCargaV390('g',[row]);assert.equal(calls.sync,0);assert.equal(calls.alerts.length,1);assert.match(calls.alerts[0],/baixa foi interrompida/i);assert(!calls.alerts[0].includes('Carregamento conferido'));assert.equal(c.carregamentos[0].volume,0.144);
});
test('pending operations retain errors only for the same revision and confirmation never infers queue completion',()=>{
 const queue=[{chave:'loads|a',revisao:'r1'}],before=JSON.stringify(queue),failure={key:'loads|a',revision:'r1',code:'permission-denied'};
 assert.deepEqual(offlineQueueStateV792(queue,failure),{pending:1,error:'permission-denied'});assert.deepEqual(offlineQueueStateV792([{...queue[0],revisao:'r2'}],failure),{pending:1,error:''});assert.deepEqual(offlineQueueStateV792([],failure),{pending:0,error:''});assert.equal(JSON.stringify(queue),before);
 assert.match(loadCompletionMessageV792(true,true),/Ajuste rápido realizado/);assert(!loadCompletionMessageV792(false,false).includes('pendente'));
});
test('completion build is repeatable, rejects missing anchors and removes status-only upsert and network wait',()=>{
 const built=applyLoadCompletionV792(original);assert.equal(applyLoadCompletionV792(built),built);assert.throws(()=>applyLoadCompletionV792('unknown'));assert(!built.includes('batchStatus'));assert(!built.includes('await sincronizarOfflineOps'));assert(built.includes('await window.__v456Local.flush?.()'));
});
test('checking an existing deduction compares server rows read-only and reports missing data without launching or deducting again',async()=>{
 const nodes=new Map(),clipboard=[];const node=()=>({children:[],replaceChildren(){this.children=[];},append(...children){this.children.push(...children);},prepend(child){this.children.unshift(child);if(child.id)nodes.set(child.id,child);}});nodes.set('v408-detalhe',node());
 const row={id:'a',grupoCargaId:'g',quantidade:3,volume:0.144,cargaStatus:'concluido',cargaBaixadaEm:123},before=JSON.stringify(row);
 const c={setTimeout,clearTimeout,employeeRequireLoadAdmin(){},itensGrupoCargaV400:()=>[row],offlineOps:()=>[{nome:'loads',id:'a',obj:row}],COL:{cargas:'loads'},loadRecordDiagnosticV791:rows=>({ids:rows.map(r=>r.id)}),incompleteLoadRowV791:r=>!r.volume,window:{__v456Local:{getItem:()=>null}},conexaoOnline:()=>true,parent:{__v470Runtime:()=>({sdk:{query:(...a)=>a,where:(...a)=>a,limit:n=>n}})},collection:()=>({}),db:{},getDocsFromServer:async()=>({docs:[]}),document:{getElementById:id=>nodes.get(id),createElement:()=>node()},navigator:{clipboard:{writeText:async text=>clipboard.push(text)}}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/load-sync-check.js',import.meta.url),'utf8'),c);await c.conferirEnvioCargaV792('g');
 const panel=nodes.get('loadSyncCheckV792');assert.match(panel.children[0].textContent,/1 com baixa registrada/);assert.match(panel.children[0].textContent,/ausente/);await panel.children.at(-1).onclick();const report=JSON.parse(clipboard[0]);assert.deepEqual(report.server.missingIds,['a']);assert.equal(report.pendingLoadOperations,1);assert.equal(JSON.stringify(row),before);
});
test('generated status cannot announce synchronization while any operation is pending or local storage has failed',()=>{
 const source=`function atualizarStatusSync(estado,msg){capture(estado,msg);}\nfunction sentinel(){}\nasync function fake(){try{}catch(e){if(op.nome===COL.madeiras)erroCadastroSyncV457=String(e?.code||e?.message||e).slice(0,100);}\n  })().finally(()=>{offlineSyncPromiseV396=null});\nconst markup=\`<button type="button" class="btn btn-secondary" onclick="copiarCargaV392('\\\${pid}')">Copiar texto</button>\`;`;
 // The anchor contains the literal template interpolation used by the generator.
 const fixture=source.replace('\\${pid}','${pid}'),built=applyOfflineSyncStateV792(fixture);
 let queue=[{chave:'loads|a',revisao:'r1'}],captured;const c={window:{},offlineOps:()=>queue,capture:(...args)=>captured=args};vm.createContext(c);vm.runInContext(built.slice(0,built.indexOf('function sentinel')),c);
 c.atualizarStatusSync('ok','Sincronizado');assert.equal(captured[0],'aguarda');assert.match(captured[1],/pendente/);
 vm.runInContext("erroEnvioOfflineV792={key:'loads|a',revision:'r1',code:'permission-denied'}",c);c.atualizarStatusSync('ok','Sincronizado');assert.equal(captured[0],'erro');assert.match(captured[1],/permission-denied/);
 queue=[];c.atualizarStatusSync('ok','Envios confirmados');assert.deepEqual(captured,['ok','Envios confirmados']);c.window.__smRecordStorageFailureV779='disk failed';c.atualizarStatusSync('ok','Sincronizado');assert.equal(captured[0],'erro');assert.match(captured[1],/Gravação no aparelho/);
 assert.equal(applyOfflineSyncStateV792(built),built);assert.throws(()=>applyOfflineSyncStateV792('unknown'));
});
