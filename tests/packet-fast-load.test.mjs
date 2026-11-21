import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup(){let id=0;const seed={id:'seed',tipoMedida:'m2',quantidade:6,volume:1.8,largura:10,comprimento:3,valor:280.8,preco:156,contadoComoPacote:true,sessaoPacote:'session',grupoCargaId:'load',estoqueOrigem:'estoque2',cargaFluxoV388:true,cargaStatus:'montagem',autoPriceV1:{retail:156,policy:{enabled:true}}},ops=[];
 const c={destinoSelecionado:()=> 'carga',modoMedida:'m2',contadorPacotesLigado:true,producaoCalcPendente:null,lancamentos:[seed],carregamentos:[seed],contadorPacotes:1,COL:{cargas:'loads'},crypto:{randomUUID:()=> 'new'+ ++id},Date,enfileirarOffline:(...args)=>ops.push(args)};vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/packet-fast-load.js',import.meta.url),'utf8'),c);return{c,ops,seed};}
test('fast copies preserve individual IDs, geometry, stock source, grouping and price snapshot without physical deduction',()=>{
 const s=setup();assert.equal(s.c.copiarPacotesCargaV780(319),319);assert.equal(s.c.contadorPacotes,320);assert.equal(s.c.carregamentos.length,320);assert.equal(s.ops.length,319);assert.equal(new Set(s.c.carregamentos.map(r=>r.id)).size,320);assert.equal(s.c.carregamentos.reduce((n,r)=>n+r.quantidade,0),1920);assert(Math.abs(s.c.carregamentos.reduce((n,r)=>n+r.volume,0)-576)<1e-8);
 for(const row of s.c.carregamentos){assert.equal(row.cargaStatus,'montagem');assert.equal(row.estoqueOrigem,'estoque2');assert.equal(row.grupoCargaId,'load');assert.equal(row.sessaoPacote,'session');assert.equal(row.preco,156);assert(!row.cargaBaixadaEm);}
 s.c.carregamentos[1].autoPriceV1.policy.enabled=false;assert.equal(s.seed.autoPriceV1.policy.enabled,true);
});
test('production-linked, completed and non-load flows keep the regular validated launch path',()=>{
 for(const field of ['producaoPendenteV388','cargaBaixadaEm']){const s=setup();s.seed[field]={pedidoId:'order'};assert.equal(s.c.copiarPacotesCargaV780(320),0);assert.equal(s.ops.length,0);}
 const s=setup();s.c.destinoSelecionado=()=> 'estoque2';assert.equal(s.c.copiarPacotesCargaV780(320),0);assert.equal(s.ops.length,0);
});
