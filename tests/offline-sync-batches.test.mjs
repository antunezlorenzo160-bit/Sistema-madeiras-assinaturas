import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {offlineSyncBatchesV794,acknowledgeOfflineBatchV794,summarizeOfflineQueueV794} from '../public/offline-sync-batches.mjs';
import {applyOfflineSyncBatchesV794} from '../scripts/offline-sync-batches-build.mjs';
const op=(id,mode='set',name='loads')=>({chave:name+'|'+id,nome:name,id,modo:mode,obj:{id,quantidade:3,volume:0.144,grupoCargaId:'g'},revisao:'r1'});
function setup(rows){
 let queue=structuredClone(rows);const calls={batches:[],flushes:0,status:[],remaining:[],budgets:0},c={TextEncoder,Date,setTimeout:fn=>fn(),window:{__v456Local:{flush:async()=>{calls.flushes++;}}},offlineSyncBatchesV794,acknowledgeOfflineBatchV794,parent:{__smEmployeeCollectionCan:()=>true},COL:{orcamento:'budgets',madeiras:'woods'},acessoPlanoAtual:()=>({write:true}),lotePacotesEmCurso:false,conexaoOnline:()=>true,offlineOps:()=>queue,salvarOfflineOps:rows=>{queue=rows;calls.remaining.push(rows.length);},erroEnvioOfflineV792:null,erroCadastroSyncV457:'',atualizarStatusSync:(...a)=>calls.status.push(a),marcarSyncErro:(...a)=>calls.status.push(['erro',a[1]]),agendarAplicacaoV428(){},atualizarPendenciasCadastroV457(){},enviarOperacaoOrcamentoV705:async()=>{calls.budgets++;},db:{},doc:(_,name,id)=>({name,id}),writeBatch:()=>{const staged=[];return {set:(ref,obj,options)=>staged.push({mode:options?'merge':'set',ref,obj}),delete:ref=>staged.push({mode:'delete',ref}),commit:async()=>{if(c.beforeCommit)await c.beforeCommit(staged);calls.batches.push(staged);}};}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/offline-sync-batches.js',import.meta.url),'utf8'),c);return {c,calls,get queue(){return queue;},set queue(value){queue=value;}};
}
test('9671 operations use 97 bounded commits with durable per-batch acknowledgement and no per-record network write',async()=>{
 const rows=Array.from({length:9671},(_,i)=>op(String(i))),before=JSON.stringify(rows),s=setup(rows);await s.c.sincronizarOfflineOps();assert.equal(s.calls.batches.length,97);assert(s.calls.batches.every(b=>b.length<=100));assert.equal(s.calls.batches.flat().length,9671);assert.equal(s.queue.length,0);assert.equal(s.calls.remaining[0],9571);assert.equal(s.calls.remaining.at(-1),0);assert.equal(s.calls.flushes,98);assert.equal(JSON.stringify(rows),before);
});
test('budget upserts retain their transaction barrier and deletes/merges keep their original semantics',async()=>{
 const rows=[op('a'),op('quote','merge','budgets'),op('gone','delete'),op('patch','merge')],s=setup(rows);await s.c.sincronizarOfflineOps();assert.equal(s.calls.budgets,1);assert.equal(s.calls.batches.length,2);assert.deepEqual(s.calls.batches[1].map(o=>o.mode),['delete','merge']);assert.equal(s.queue.length,0);
});
test('rejected atomic batch keeps all operations and stops without automatic retry or clearing',async()=>{
 const s=setup(Array.from({length:250},(_,i)=>op(String(i))));let attempts=0;s.c.beforeCommit=()=>{attempts++;const error=Error('not allowed');error.code='permission-denied';throw error;};await s.c.sincronizarOfflineOps();assert.equal(attempts,1);assert.equal(s.queue.length,250);assert.equal(s.calls.remaining.length,0);assert.equal(s.c.erroEnvioOfflineV792.code,'permission-denied');assert(s.calls.status.some(a=>a[0]==='erro'));
});
test('new revision queued during commit is not acknowledged with the old snapshot and is sent afterwards',async()=>{
 const s=setup([op('a')]);let first=true;s.c.beforeCommit=()=>{if(first){first=false;s.queue=[{...op('a'),revisao:'r2',obj:{quantidade:8,volume:1}}];}};await s.c.sincronizarOfflineOps();assert.equal(s.calls.remaining[0],1);assert.equal(s.calls.batches.length,2);assert.equal(s.calls.batches[1][0].obj.quantidade,8);assert.equal(s.queue.length,0);
});
test('connection loss cannot acknowledge a wrapper commit that may only have queued locally',async()=>{
 const s=setup([op('a')]);let online=true;s.c.conexaoOnline=()=>online;s.c.beforeCommit=()=>{online=false;};await s.c.sincronizarOfflineOps();assert.equal(s.queue.length,1);assert.equal(s.calls.remaining.length,0);
});
test('local flush failure before sending leaves queue intact and parallel attempts share one sender',async()=>{
 const s=setup([op('a')]);s.c.window.__v456Local.flush=async()=>{throw Error('disk failed');};await s.c.sincronizarOfflineOps();assert.equal(s.calls.batches.length,0);assert.equal(s.queue.length,1);
 const t=setup(Array.from({length:150},(_,i)=>op(String(i))));await Promise.all([t.c.sincronizarOfflineOps(),t.c.sincronizarOfflineOps()]);assert.equal(t.calls.batches.length,2);assert.equal(t.queue.length,0);
});
test('blocked collection is retained without committing, payload cap splits before server size limits, and diagnostics are read-only',async()=>{
 const s=setup([op('a')]);s.c.parent.__smEmployeeCollectionCan=()=>false;await s.c.sincronizarOfflineOps();assert.equal(s.queue.length,1);assert.equal(s.calls.batches.length,0);
 const rows=[op('a'),{...op('b'),obj:{note:'x'.repeat(1000)}}];assert.equal(offlineSyncBatchesV794(rows,'budgets',{maxBytes:1100}).length,2);assert.deepEqual(summarizeOfflineQueueV794([op('a'),op('b'),op('c','delete')]),[{collection:'loads',mode:'set',count:2},{collection:'loads',mode:'delete',count:1}]);assert.equal(acknowledgeOfflineBatchV794([{...op('a'),revisao:'r2'}],[op('a')]).length,1);
 const source="let offlineSyncPromiseV396=null;\nasync function sincronizarOfflineOps(){}\nwindow.addEventListener('online',()=>{});",built=applyOfflineSyncBatchesV794(source);assert.equal(applyOfflineSyncBatchesV794(built),built);assert.throws(()=>applyOfflineSyncBatchesV794('unknown'));
});
