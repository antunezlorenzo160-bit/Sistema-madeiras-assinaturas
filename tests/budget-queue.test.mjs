import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,copyFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildBudgetQueue} from '../scripts/build-budget-queue.mjs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),start=html.indexOf('const TEMPLATE=')+15;
let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
const app=JSON.parse(html.slice(start,end));
const flush=app.slice(app.indexOf('async function sincronizarOfflineOps(){'),app.indexOf("\nwindow.addEventListener('online'",app.indexOf('async function sincronizarOfflineOps(){')));
const operation=(overrides={})=>({nome:'sm2_orcamento_itens',id:'piece',chave:'sm2_orcamento_itens|piece',revisao:'r1',modo:'set',obj:{quantidade:2},...overrides});
function setup(ops,initial){
 let queue=ops,stored=initial,revision=0,writes=0,reads=0,scheduled=0,afterRead=()=>{},failure=false;
 const context=vm.createContext({empresaV456:'tenant',db:{},COL:{orcamento:'sm2_orcamento_itens',madeiras:'sm2_madeiras'},lotePacotesEmCurso:false,
  conexaoOnline:()=>true,offlineSyncPromiseV396:null,offlineOps:()=>queue,salvarOfflineOps:next=>{queue=next;},
  doc:(db,nome,id)=>({path:`empresas/tenant/dados/${nome}/registros/${id}`}),
  agendarAplicacaoV428:()=>scheduled++,erroCadastroSyncV457:'',atualizarPendenciasCadastroV457(){},
  deleteDoc:async()=>{},setDoc:async()=>assert.fail('budget must use guarded transaction'),
  diagnosticoLeiturasV700:{wrapRead:(kind,read)=>read},console:{warn(){},error(){}},
  parent:{__smDadosFirestoreV538:value=>value,__v470Runtime:()=>({sdk:{runTransaction:async(db,callback)=>{
    if(failure)throw Error('unavailable');
    for(let attempt=0;attempt<5;attempt++){
     const before=revision;let staged;
     const result=await callback({get:async()=>{reads++;const copy=stored?{...stored}:undefined;afterRead();return {exists:()=>!!copy,data:()=>copy};},
      set:(ref,data,options)=>{staged=options?.merge?{...stored,...data}:{...data};}});
     if(before!==revision)continue;
     if(staged){stored=staged;revision++;writes++;}return result;
    }throw Error('conflict');
   }}})}});
 vm.runInContext(readFileSync(new URL('../ui/budget-records.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../ui/budget-queue.js',import.meta.url),'utf8')+'\n'+flush,context);
 return {run:()=>vm.runInContext('sincronizarOfflineOps()',context),queue:()=>queue,data:()=>stored,writes:()=>writes,reads:()=>reads,scheduled:()=>scheduled,
  replaceQueue:next=>{queue=next;},remoteDelete:()=>{stored={...stored,excluido:true};revision++;},onRead:fn=>{afterRead=fn;},fail:()=>{failure=true;}};
}
test('confirmed addition leaves no queued replay after a second device deletes it and the PC reloads',async()=>{
 const s=setup([operation()]);await s.run();assert.equal(s.queue().length,0);assert.equal(s.writes(),1);assert.equal(s.data().quantidade,2);
 s.remoteDelete();await s.run();assert.equal(s.data().excluido,true);assert.equal(s.writes(),1);assert.equal(s.scheduled(),1);
});
test('legacy queued active row cannot recreate a remotely excluded item on refresh',async()=>{
 const s=setup([operation()],{quantidade:2,excluido:true});await s.run();
 assert.equal(s.writes(),0);assert.equal(s.queue().length,0);assert.equal(s.data().excluido,true);assert.equal(s.scheduled(),1);
});
test('transaction retries against a concurrent remote exclusion and does not undo it',async()=>{
 const s=setup([operation()],{quantidade:2,excluido:false});let first=true;
 s.onRead(()=>{if(first){first=false;s.remoteDelete();}});await s.run();
 assert.equal(s.reads(),2);assert.equal(s.writes(),0);assert.equal(s.data().excluido,true);assert.equal(s.queue().length,0);
});
test('acknowledging an older revision does not remove a newer local edit',async()=>{
 const s=setup([operation()]);let first=true;
 s.onRead(()=>{if(first){first=false;s.replaceQueue([operation({revisao:'r2',obj:{quantidade:4}})]);}});await s.run();
 assert.equal(s.writes(),2);assert.equal(s.data().quantidade,4);assert.equal(s.queue().length,0);
});
test('deliberate saved-budget reopening remains possible and ordinary stale patches remain excluded',async()=>{
 const s=setup([operation({modo:'merge',obj:{excluido:false,quantidade:3}})],{quantidade:2,excluido:true});await s.run();
 assert.equal(s.data().excluido,false);assert.equal(s.data().quantidade,3);
 const stale=setup([operation({modo:'merge',obj:{quantidade:8}})],{quantidade:2,excluido:true});await stale.run();assert.equal(stale.data().excluido,true);assert.equal(stale.writes(),0);
});
test('failed writes keep their durable queue entry',async()=>{
 const s=setup([operation()]);s.fail();await s.run();assert.equal(s.queue().length,1);assert.equal(s.writes(),0);
});
test('build removes the duplicate direct write and remains idempotent',()=>{
 const dir=mkdtempSync(join(tmpdir(),'budget-queue-')),file=join(dir,'index.html');
 try{copyFileSync(new URL('../public/index.html',import.meta.url),file);buildBudgetQueue(file);const first=readFileSync(file,'utf8');buildBudgetQueue(file);assert.equal(readFileSync(file,'utf8'),first);
 assert(!first.includes('Promise.resolve(gravarDoc(COL.orcamento,oi.id,oi))'));assert(first.includes('enviarOperacaoOrcamentoV705(op)'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
