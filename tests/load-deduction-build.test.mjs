import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {applyLoadDeductionSafety} from '../scripts/load-deduction-build.mjs';
import {createLoadDeductionJournal,mergeLoadDeductionQueue} from '../public/load-deduction-journal.mjs';
function template(html){const start=html.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}return JSON.parse(html.slice(start,end));}
function setup(previousStorage){
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),built=applyLoadDeductionSafety(html),app=template(built);
 assert.equal(applyLoadDeductionSafety(built),built);
 const start=app.indexOf('async function salvarCargaComBaixa('),end=app.indexOf('\nfunction mesmaBitolaTransferencia',start);
 const values=new Map(),storage=previousStorage||{durable:true,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let serial=0;
 if(!storage.journalStore)storage.journalStore={value:null,async get(){return structuredClone(this.value);},async put(value){if(this.value)throw Error('Pending journal');this.value=structuredClone(value);},async remove(){this.value=null;}};
 const draft={id:'load-item',grupoCargaId:'group',quantidade:5,volume:5,valor:50,tipoMedida:'m3',madeira:'Pinus',cargaFluxoV388:true,cargaStatus:'aguardando_conferencia'};
 const context={window:{__v456Local:storage,__smLoadDeductionJournal:createLoadDeductionJournal(storage,{journalStore:storage.journalStore}),__smMergeLoadDeductionQueue:mergeLoadDeductionQueue},COL:{estoque1:'stock1',estoque2:'stock2',cargas:'loads',movimentos:'moves'},STORAGE:{lancamentos:'summary',movimentos:'movements'},OFFLINE_OPS_KEY:'queue',estoque1Lancamentos:[{id:'stock',quantidade:20,volume:20,valor:200}],estoque2Lancamentos:[],carregamentos:[draft],lancamentos:[draft],movimentos:[],sessaoCargaAtual:'group',Date,crypto:{randomUUID},conexaoOnline:()=>false,ehMadeiraVerde:()=>false,mesmaBitolaCarga:()=>true,nowBR:()=>'',adicionarReferenciaPesoV420:x=>x,doc:(...args)=>args,db:{},employeeCheckLoadWrite(){},employeeAssertWrite(){},exigirEscritaPlano(){},offlineOps:()=>JSON.parse(storage.getItem('queue')||'[]'),atualizarPendenciasCadastroV457(){},sincronizarOfflineOps:async()=>{},save(){throw Error('Legacy non-atomic save must not run');}};
 vm.createContext(context);vm.runInContext(app.slice(start,end),context);
 return {context,storage,item:{...draft,cargaStatus:'concluido',cargaBaixadaEm:100}};
}
test('real load deduction replaces draft rather than appending and retry cannot debit stock twice',async()=>{
 const {context:c,item}=setup();
 await c.salvarCargaComBaixa(item,'estoque1','Carga');await c.salvarCargaComBaixa(item,'estoque1','Carga');
 assert.equal(c.estoque1Lancamentos[0].quantidade,15);assert.equal(c.carregamentos.length,1);assert.equal(c.carregamentos[0].volume,5);assert.equal(c.movimentos.length,1);
 assert.equal(JSON.parse(c.window.__v456Local.getItem('queue')).length,3);
});
test('insufficient stock changes neither the load nor local persistence',async()=>{
 const {context:c,item,storage}=setup();c.estoque1Lancamentos[0].quantidade=2;
 await assert.rejects(c.salvarCargaComBaixa(item,'estoque1','Carga'),/ESTOQUE_INSUFICIENTE/);
 assert.equal(c.carregamentos.length,1);assert.equal(c.estoque1Lancamentos[0].quantidade,2);assert.equal(storage.getItem('queue'),null);
});

test('451-piece regression resumes after a partial load and preserves 15.43917 m3 without repeated stock movements',async()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/carga-offline-451.json',import.meta.url),'utf8'));
 const items=fixture.map(row=>({...row,grupoCargaId:'group',tipoMedida:'m3',cargaFluxoV388:true,cargaStatus:'aguardando_conferencia',valor:0}));
 const first=setup(),c=first.context;c.carregamentos=structuredClone(items);c.lancamentos=structuredClone(items);
 c.estoque1Lancamentos=items.map(row=>({...row,id:'stock-'+row.id,quantidade:row.quantidade*2,volume:row.volume*2}));
 c.mesmaBitolaCarga=(a,b)=>a.madeiraId===b.madeiraId;
 for(const item of items.slice(0,25))await c.salvarCargaComBaixa({...item,cargaStatus:'concluido',cargaBaixadaEm:100},'estoque1','Carga');
 const reboot=setup(first.storage),r=reboot.context;
 await r.window.__smLoadDeductionJournal.recover();
 for(const [field,key]of [['estoque1Lancamentos','estoque1_lancamentos_v1'],['estoque2Lancamentos','estoque2_lancamentos_v1'],['carregamentos','carregamentos_lancamentos_v1'],['lancamentos','summary'],['movimentos','movements']])r[field]=JSON.parse(first.storage.getItem(key));
 r.mesmaBitolaCarga=(a,b)=>a.madeiraId===b.madeiraId;
 for(let attempt=0;attempt<2;attempt++)for(const item of items)await r.salvarCargaComBaixa({...item,cargaStatus:'concluido',cargaBaixadaEm:100},'estoque1','Carga');
 assert.equal(r.carregamentos.length,75);assert.equal(r.carregamentos.reduce((s,x)=>s+x.quantidade,0),451);
 assert(Math.abs(r.carregamentos.reduce((s,x)=>s+x.volume,0)-15.43917)<1e-9);
 assert.equal(r.estoque1Lancamentos.reduce((s,x)=>s+x.quantidade,0),451);assert.equal(r.movimentos.length,75);
 assert(Math.abs(r.movimentos.reduce((s,x)=>s+x.volume,0)-15.43917)<1e-9);
});
function setupExecutor({storageFailure=false,renderFailure=false}={}){
 const s=setup(),c=s.context,alerts=[];
 const html=applyLoadDeductionSafety(readFileSync(new URL('../public/index.html',import.meta.url),'utf8')),app=template(html);
 const start=app.indexOf('  const baixasEmCurso=new Set();'),end=app.indexOf('  async function ajusteRapidoEDarBaixaCargaV390',start);
 Object.assign(c,{salvarCargaComBaixaV387:c.salvarCargaComBaixa,nomeUsuarioCargaV388:()=> 'Owner',employeeLoadActor:()=>({uid:'owner'}),iniciarMutacaoCargaV396(){},finalizarMutacaoCargaV396(){},save(){},console:{error(){}},alert:m=>alerts.push(m),fecharModalAjusteRapidoV390(){},atualizarFluxoCargaV388(){if(renderFailure)throw Error('render failed');},setTimeout});
 if(storageFailure)c.window.__smLoadDeductionJournal.commit=()=>{throw Object.assign(Error('local storage full'),{name:'QuotaExceededError'});};
 vm.runInContext(app.slice(start,end),c);return {...s,alerts};
}
test('complete offline executor persists one deduction and reports successful completion',async()=>{
 const {context:c,item,alerts}=setupExecutor();await c.executarBaixaConferidaCargaV390('group',[item]);
 assert.equal(c.estoque1Lancamentos[0].quantidade,15);assert.equal(c.carregamentos.length,1);assert.equal(c.carregamentos[0].cargaStatus,'concluido');assert.equal(c.lancamentos.length,0);assert(alerts.some(m=>m.includes('estoque baixado')));
});
test('post-commit UI failure reports recorded deduction rather than an interrupted stock operation',async()=>{
 const {context:c,item,alerts}=setupExecutor({renderFailure:true});await c.executarBaixaConferidaCargaV390('group',[item]);
 assert.equal(c.estoque1Lancamentos[0].quantidade,15);assert(alerts.some(m=>m.startsWith('Baixa registrada neste aparelho.')));assert(!alerts.some(m=>m.startsWith('A baixa foi interrompida.')));
});
test('quota failure preserves stock and exposes the actual stage and reason',async()=>{
 const {context:c,item,alerts}=setupExecutor({storageFailure:true});await c.executarBaixaConferidaCargaV390('group',[item]);
 assert.equal(c.estoque1Lancamentos[0].quantidade,20);assert(alerts.some(m=>m.includes('QuotaExceededError')&&m.includes('Etapa: gravação do item')));
});
