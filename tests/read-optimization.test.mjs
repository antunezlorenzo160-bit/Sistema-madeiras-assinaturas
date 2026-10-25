import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReadOptimization } from '../scripts/build-read-optimization.mjs';

const temporary=mkdtempSync(join(tmpdir(),'madeiras-read-review-')),file=join(temporary,'index.html');
after(()=>rmSync(temporary,{recursive:true,force:true}));
copyFileSync(new URL('../public/index.html',import.meta.url),file);
buildReadOptimization(file);
const html=readFileSync(file,'utf8'),start=html.indexOf('const TEMPLATE=')+'const TEMPLATE='.length;
let end=start+1;
for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
const app=JSON.parse(html.slice(start,end));

test('measurement counts calls without reading record contents or making additional requests',async()=>{
  const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../ui/read-diagnostics.js',import.meta.url),'utf8'),context);
  const create=vm.runInContext('criarDiagnosticoLeiturasV700',context),diag=create();
  let calls=0,stopped=0,callback;
  const ref={path:'empresas/private-company-id/dados/sm2_madeiras/registros'};
  await diag.wrapRead('consultaServidor',async()=>{calls++;return {size:3};})(ref);
  const stop=diag.wrapSnapshot((ref,options,next)=>{callback=next;return()=>stopped++;})(ref,{},()=>{});
  callback({metadata:{fromCache:true},size:3});
  callback({metadata:{fromCache:false,hasPendingWrites:false},size:3,docChanges:()=>[{},{}]});
  assert.equal(diag.report().collections[0].requests.consultaServidor,1);
  assert.equal(diag.report().collections[0].maxDocumentsInSnapshot,3);
  assert.equal(calls,1);assert(!JSON.stringify(diag.report()).includes('private-company-id'));
  diag.stopAll();stop();assert.equal(stopped,1);assert.equal(diag.report().collections[0].activeListeners,0);
});
test('metadata-only write confirmation refreshes cached snapshots and clears the pending guard',()=>{
  const callbacks=[],pending=new Set(),snapshots=new Map();let scheduled=0;
  const collections=[['madeiras','sm2_madeiras'],['est1','sm2_estoque1']];
  const context=vm.createContext({confirmacoesPendentesV700:pending,dadosEscutadosV428:snapshots,
    offlineOps:()=>[],observadoresBloqueadosV429:false,conexaoOnline:()=>true,document:{hidden:false},
    cancelamentosV428:[],sessaoSyncV428:0,telemetriaLocalV429:{aberturas:0,eventosServidor:0,documentosPrimeiraResposta:0},
    atualizarStatusSync(){},setBootStep(){},agendarAplicacaoV428(){scheduled++;},falhaObservadorV428(){assert.fail('unexpected failure');},
    colecoesEscutadasV428:collections,db:{},COL:{syncTest:'sm2_sync_status'},collection:(db,path)=>({path}),doc:(db,...path)=>({path:path.join('/')}),
    onSnapshot:(ref,options,next)=>{callbacks.push(next);return()=>{};}});
  const a=app.indexOf('function abrirObservadoresV428(){'),b=app.indexOf('\nlet orcMutationVersion=',a);
  const guard=app.match(/function temOperacoesPendentesV428\(nome\)\{[^\n]+\}/)[0];
  vm.runInContext(guard+'\n'+app.slice(a,b)+'\nabrirObservadoresV428();',context);
  const first={metadata:{fromCache:false,hasPendingWrites:false},size:1,docChanges:()=>[{}]};
  callbacks[0](first);assert.equal(scheduled,1);
  callbacks[0]({...first,metadata:{fromCache:false,hasPendingWrites:true}});
  assert.equal(vm.runInContext("temOperacoesPendentesV428('sm2_madeiras')",context),true);
  const confirmed={...first,size:2,docChanges:()=>[]};callbacks[0](confirmed);
  assert.equal(snapshots.get('madeiras'),confirmed);assert.equal(scheduled,2);
  assert.equal(vm.runInContext("temOperacoesPendentesV428('sm2_madeiras')",context),false);
  callbacks[0](confirmed);assert.equal(scheduled,2); // Pure repeated metadata still does no work.
});
test('flushing one wood edit never requests the full wood catalog again',async()=>{
  let queue=[{nome:'sm2_madeiras',id:'wood-1',obj:{nome:'Pinus'},chave:'sm2_madeiras|wood-1',revisao:'one'}],writes=0,reads=0,scheduled=0;
  const context=vm.createContext({lotePacotesEmCurso:false,conexaoOnline:()=>true,offlineSyncPromiseV396:null,
    offlineOps:()=>queue,salvarOfflineOps:next=>{queue=next;},setDoc:async()=>{writes++;},deleteDoc:async()=>{},
    doc:()=>({}),db:{},COL:{madeiras:'sm2_madeiras'},erroCadastroSyncV457:'',atualizarPendenciasCadastroV457(){},
    agendarAplicacaoV428(){scheduled++;},getDocsFromServer:async()=>{reads++;throw Error('Full read forbidden');},console});
  const a=app.indexOf('async function sincronizarOfflineOps(){'),b=app.indexOf("\nwindow.addEventListener('online'",a);
  assert(a>=0&&b>a);vm.runInContext(app.slice(a,b),context);
  await vm.runInContext('sincronizarOfflineOps()',context);
  assert.equal(queue.length,0);assert.equal(writes,1);assert.equal(reads,0);assert.equal(scheduled,1);
});
