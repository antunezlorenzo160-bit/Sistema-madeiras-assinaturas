import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function app(){const s=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');const a=s.indexOf('const TEMPLATE=')+15;let b=a+1;for(;b<s.length;b++){if(s[b]==='\\'){b++;continue;}if(s[b]==='"'){b++;break;}}return JSON.parse(s.slice(a,b));}
function setup(){
 const queued=new Map(),local=new Map();const c={console,structuredClone,setTimeout(){},AbortSignal,parent:{__smEmployeeMember:()=>({papel:'admin'})},window:{__v456Local:{getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v)}},document:{getElementById:()=>null},madeiras:[{id:'a',bitolas:[{espessura:5,precoVarejo:100,precoAtacado:80}]},{id:'b',bitolas:[{espessura:5,precoVarejo:100,precoAtacado:80}]}],normalizarBitolasCadastroV347:x=>x,orcamento:[],carregamentos:[],lancamentos:[],COL:{orcamento:'quotes',cargas:'loads'},STORAGE:{orcamento:'quote-local',lancamentos:'summary'},enfileirarOffline:(name,id,item)=>queued.set(name+':'+id,structuredClone(item)),aplicarCobrancaOrcamento:x=>({...x,valor:x.volume*x.preco}),sessaoCargaAtual:'group',producaoCalcPendente:null,adicionarReferenciaPesoV420:x=>x,employeeRequireLoadDraftWrite(){},employeeLoadActor:()=>({uid:'owner',name:'Owner'}),save(){},sincronizarOfflineOps:async()=>{},atualizarFluxoCargaV388(){}};
 vm.createContext(c);const pure=['document-pricing.mjs','load-sales.mjs'].map(p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8').replaceAll('export ','')).join('\n');const ui=readFileSync(new URL('../ui/preview-pricing.js',import.meta.url),'utf8');vm.runInContext(pure+'\n'+ui,c);vm.runInContext("pricePolicyV710={enabled:true,limits:{m3:1},revision:1}",c);
 return {c,queued,local};
}
test('new multi-species quote reprices all rows, persists offline and returns to retail after deletion',()=>{
 const {c,queued}=setup();vm.runInContext(`
  const first={id:'1',madeiraId:'a',tipoMedida:'m3',espessura:5,volume:.6,preco:100};
  orcamento.push(attachPriceV710(first,orcamento));repriceBudgetV710();
  const second={id:'2',madeiraId:'b',tipoMedida:'m3',espessura:5,volume:.5,preco:100};
  orcamento.push(attachPriceV710(second,orcamento));repriceBudgetV710();
 `,c);assert.equal(c.orcamento[0].preco,80);assert.equal(c.orcamento[1].preco,80);assert.equal(queued.get('quotes:1').preco,80);assert.equal(queued.get('quotes:2').preco,80);
 vm.runInContext('orcamento.pop();repriceBudgetV710();',c);assert.equal(c.orcamento[0].preco,100);assert.equal(queued.get('quotes:1').preco,100);
});
test('actual generated load save queues updated prices, avoiding a stale retail overwrite on the newest item',async()=>{
 const {c,queued}=setup();const source=app(),a=source.indexOf('async function salvarPreCargaSemBaixaV388('),b=source.indexOf('\n  }',a)+4;assert(a>=0&&b>a);vm.runInContext(source.slice(a,b),c);
 for(const [id,wood,volume] of [['1','a',.6],['2','b',.5]])await c.salvarPreCargaSemBaixaV388({id,madeiraId:wood,tipoMedida:'m3',espessura:5,volume,preco:100,valor:volume*100},'estoque1');
 assert.equal(c.carregamentos.length,2);assert.equal(queued.get('loads:1').preco,80);assert.equal(queued.get('loads:2').preco,80);assert.equal(c.carregamentos[1].valor,40);
});
test('existing draft without opt-in never gains automatic repricing',()=>{
 const {c,queued}=setup();c.orcamento.push({id:'old',preco:99,volume:2});vm.runInContext("orcamento.push(attachPriceV710({id:'new',madeiraId:'a',volume:1,preco:100,espessura:5},orcamento));repriceBudgetV710();",c);assert.equal(c.orcamento[0].preco,99);assert(!c.orcamento[1].autoPriceV1);assert.equal(queued.size,0);
});
