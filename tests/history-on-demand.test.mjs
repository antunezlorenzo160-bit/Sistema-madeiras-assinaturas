import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildReadOptimization } from '../scripts/build-read-optimization.mjs';
import { buildHistoryOnDemand } from '../scripts/build-history-on-demand.mjs';

const temporary=mkdtempSync(join(tmpdir(),'madeiras-history-review-')),file=join(temporary,'index.html');
after(()=>rmSync(temporary,{recursive:true,force:true}));
copyFileSync(new URL('../public/index.html',import.meta.url),file);buildReadOptimization(file);buildHistoryOnDemand(file);buildHistoryOnDemand(file);
const html=readFileSync(file,'utf8'),start=html.indexOf('const TEMPLATE=')+'const TEMPLATE='.length;
let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
const app=JSON.parse(html.slice(start,end));

function setup(){
  const targets=[],snapshots=new Map();let scheduled=0;
  const COL={madeiras:'madeiras',estoque1:'est1',estoque2:'est2',cargas:'cargas',movimentos:'movimentos',orcamento:'orcamento',orcamentosGuardados:'pedidos',servicos:'servicos',syncTest:'teste'};
  const context=vm.createContext({COL,db:{},window:{addEventListener(){}},document:{hidden:false,addEventListener(){},getElementById:()=>null},
    observadoresBloqueadosV429:false,conexaoOnline:()=>true,cancelamentosV428:[],sessaoSyncV428:0,confirmacoesPendentesV700:new Set(),
    dadosEscutadosV428:snapshots,cadastroSyncRodando:false,reprocessarV428:false,agendamentoV428:null,
    setTimeout:()=>{scheduled++;return 1;},sincronizarSomenteCadastros(){},atualizarStatusSync(){},setBootStep(){},console,
    telemetriaLocalV429:{aberturas:0,eventosServidor:0,documentosPrimeiraResposta:0},falhaObservadorV428(){assert.fail('unexpected failure');},
    collection:(db,path)=>({path}),doc:(db,...path)=>({path:path.join('/')}),onSnapshot:(ref,options,next)=>{targets.push({ref,next});return()=>{};}});
  vm.runInContext(app.match(/const colecoesEscutadasV428=\[[\s\S]*?\];/)[0],context);
  const a=app.indexOf('// HISTORY_LAZY_V701'),b=app.indexOf('\nlet orcMutationVersion=',a);
  vm.runInContext(app.slice(a,b),context);
  const gateStart=app.indexOf('function agendarAplicacaoV428(){'),gateEnd=app.indexOf('\nfunction encerrarObservadoresV428()',gateStart);
  vm.runInContext(app.slice(gateStart,gateEnd),context);
  return {context,targets,snapshots,scheduled:()=>scheduled};
}
test('startup avoids the complete movements collection; first history visit subscribes exactly once',()=>{
  const s=setup();vm.runInContext('abrirObservadoresV428()',s.context);
  assert.equal(s.targets.length,8);assert(!s.targets.some(t=>t.ref.path==='movimentos'));
  vm.runInContext('abrirHistoricoMovimentosV701();abrirHistoricoMovimentosV701();',s.context);
  assert.equal(s.targets.filter(t=>t.ref.path==='movimentos').length,1);
  const movements=s.targets.find(t=>t.ref.path==='movimentos');
  const snapshot={metadata:{fromCache:false,hasPendingWrites:false},size:10,docChanges:()=>[{}]};
  movements.next(snapshot);assert.equal(s.snapshots.get('movimentos'),snapshot);
});
test('initial synchronization does not wait for history and cannot substitute history for a required stock response',()=>{
  const s=setup(),keys=vm.runInContext('colecoesEscutadasV428.map(([key])=>key)',s.context);
  for(const key of keys)s.snapshots.set(key,{});s.snapshots.set('teste',{});
  vm.runInContext('agendarAplicacaoV428()',s.context);assert.equal(s.scheduled(),1);
  s.snapshots.delete('madeiras');s.snapshots.set('movimentos',{});s.context.agendamentoV428=null;
  vm.runInContext('agendarAplicacaoV428()',s.context);assert.equal(s.scheduled(),1);
});
test('local history is preserved before the first remote snapshot',()=>{
  const local=[{id:'saved',volume:2}];const context=vm.createContext({movimentos:local,snapMovimentos:undefined,docsParaArray:()=>assert.fail('no snapshot exists')});
  const line=app.match(/let servidorMovimentos=[^\n]+;/)[0];
  assert.equal(vm.runInContext(line+'servidorMovimentos',context),local);
});
