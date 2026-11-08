import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {normalizePricePolicy,applyDocumentPrices,catalogPricePair,documentQuantities,priceUnit} from '../public/document-pricing.mjs';
import {priceLoadServices} from '../public/load-sales.mjs';
const policy={enabled:true,limits:{m3:10},revision:1};
function setup({volume=29.2285,wholesale=2200,snapshot=policy,legacy=false,enabled=true}={}){
 const nodes={},writes=[],local=new Map();
 const element=(id='')=>({id,value:'',textContent:'',title:'',children:[],classList:{toggle(){}},append(...children){this.children.push(...children);for(const child of children)if(child?.id)nodes[child.id]=child;}});
 for(const [id,value] of Object.entries({calcMadeira:'wood',largura:'',espessura:'5',comprimento:'5.5',quantidade:'1',precoM3:'2500'})){nodes[id]=element(id);nodes[id].value=value;}
 nodes.precoBitolaAoLado=element('precoBitolaAoLado');nodes.precoBitolaAoLado.textContent='R$ 2.500,00/m³';nodes.previewValor=element('previewValor');nodes.previewValor.parentElement=element();
 const row={id:'row',madeiraId:'wood',madeira:'Garapeira',tipoMedida:'m3',espessura:5,largura:10,comprimento:5.5,quantidade:1,volume,preco:2500,valor:volume*2500,cargaStatus:'montagem',grupoCargaId:'current',...(legacy?{}:{autoPriceV1:{retail:2500,wholesale,policy:snapshot}})};
 const c={normalizePricePolicy,applyDocumentPrices,catalogPricePair,documentQuantities,priceUnit,priceLoadServices,setTimeout(){},window:{__v456Local:{getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v)}},parent:{__smEmployeeMember:()=>({papel:'admin'})},document:{getElementById:id=>nodes[id]||null,createElement:()=>element(),createTextNode:text=>({textContent:text})},$:id=>nodes[id]||null,modoMedida:'m3',destinoSelecionado:()=> 'carga',sessaoCargaAtual:'current',carregamentos:volume?[row]:[],lancamentos:volume?[{...row}]:[],orcamento:[],madeiras:[{id:'wood',nome:'Garapeira',bitolas:[{espessura:5,precoVarejo:2500,precoAtacado:wholesale}]}],normalizarBitolasCadastroV347:x=>x,moeda:n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),servicosM3:{endireitamento:0,aplainamento:0},COL:{cargas:'loads'},STORAGE:{lancamentos:'summary'},enfileirarOffline:(...args)=>writes.push(args),renderLancamentos(){},calcPreview(){},sincronizarOfflineOps:async()=>{}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/preview-pricing.js',import.meta.url),'utf8'),c);vm.runInContext('pricePolicyV710='+JSON.stringify({...policy,enabled}),c);
 return {c,nodes,writes,row};
}
test('29 m3 with a blank width shows wholesale rather than the stale retail rate, without changing a document',()=>{
 const s=setup(),before=JSON.stringify(s.c.carregamentos);s.c.previewDocumentValueV710();assert.match(s.nodes.precoBitolaAoLado.textContent,/2\.200,00/);assert.equal(s.nodes.precoBitolaAoLado.title,'Preço de atacado');assert.match(s.nodes.pricePreviewV710.textContent,/atacado.*29,2285.*varejo até 10/);assert.match(s.nodes.previewValor.textContent,/0,00/);assert.equal(s.nodes.precoM3.value,'2500');assert.equal(JSON.stringify(s.c.carregamentos),before);assert.equal(s.writes.length,0);
});
test('the boundary stays retail, and a candidate that crosses it previews wholesale without mutating rows',()=>{
 const exact=setup({volume:10});exact.c.previewDocumentValueV710();assert.match(exact.nodes.pricePreviewV710.textContent,/varejo/);assert.equal(exact.nodes.precoBitolaAoLado.title,'Preço de varejo');
 const s=setup({volume:9.99});s.nodes.largura.value='10';s.c.previewDocumentValueV710();assert.equal(s.nodes.precoBitolaAoLado.title,'Preço de atacado');assert.match(s.nodes.previewValor.textContent,/60,50/);assert.equal(s.writes.length,0);
});
test('missing wholesale is visible even before typing width; it never invents a wholesale price',()=>{
 const s=setup({wholesale:0});s.c.previewDocumentValueV710();assert.match(s.nodes.precoBitolaAoLado.textContent,/2\.500,00/);assert.match(s.nodes.pricePreviewV710.textContent,/atacado não cadastrado/);
});
test('a stored threshold remains explicit; applying current rules touches only the current unfinished load',()=>{
 const s=setup({volume:15,snapshot:{...policy,limits:{m3:20}}});const saved={...s.row,id:'saved',grupoCargaId:'saved',cargaStatus:'concluido',cargaBaixadaEm:1,preco:3000,valor:45000},other={...s.row,id:'other',grupoCargaId:'other',preco:3000,valor:45000};s.c.carregamentos.push(saved,other);s.c.previewDocumentValueV710();assert.match(s.nodes.pricePreviewV710.textContent,/varejo até 20/);assert(s.nodes.pricePreviewV710.children.some(x=>x.textContent==='Aplicar limites e preços atuais'));
 s.c.applyCurrentLoadPricingV729();assert.equal(s.c.carregamentos[0].preco,2200);assert.equal(s.c.carregamentos[0].autoPriceV1.policy.limits.m3,10);assert.equal(s.c.carregamentos[1].preco,3000);assert.equal(s.c.carregamentos[2].preco,3000);assert(s.writes.every(([,id])=>id==='row'));
});
test('legacy loads are not adopted silently and a newly disabled company rule does not break an active snapshot',()=>{
 const s=setup({legacy:true});s.c.previewDocumentValueV710();assert.match(s.nodes.pricePreviewV710.textContent,/mantém os preços salvos/);assert.equal(s.writes.length,0);s.c.applyCurrentLoadPricingV729();assert.equal(s.c.carregamentos[0].preco,2200);
 const existing=setup({enabled:false});const candidate=existing.c.attachPriceV710({...existing.row,id:'new'},existing.c.carregamentos);assert(candidate.autoPriceV1.policy.enabled);existing.c.previewDocumentValueV710();assert.match(existing.nodes.precoBitolaAoLado.textContent,/2\.200,00/);
});
test('leaving sales restores the base rate, and green locked prices stay fixed on explicit adoption',()=>{
 const s=setup();s.c.previewDocumentValueV710();s.c.destinoSelecionado=()=> 'estoque1';s.c.previewDocumentValueV710();assert.match(s.nodes.precoBitolaAoLado.textContent,/2\.500,00/);
 const green=setup({legacy:true}),locked={...green.row,id:'green',estadoMadeira:'verde',preco:1800,valor:1800,autoPriceV1:{retail:1800,wholesale:0,locked:true,policy:{...policy,limits:{m3:50}}}};green.c.carregamentos.unshift(locked);green.c.applyCurrentLoadPricingV729();assert.equal(green.c.carregamentos[0].preco,1800);assert.equal(green.c.carregamentos[0].autoPriceV1.policy.limits.m3,10);assert.equal(green.c.carregamentos[1].preco,2200);
});
test('explicit adoption retains the selected processing surcharge and persists equal-price policy changes',()=>{
 const s=setup({volume:15,legacy:true});s.c.carregamentos[0]=priceLoadServices({...s.row,endireitamento:true,precoEndireitamento:10,servicePricingV727:true});s.c.applyCurrentLoadPricingV729();const changed=s.c.carregamentos[0];assert.equal(changed.preco,2200);assert.equal(changed.valorMaterial,33000);assert.equal(changed.valorServicos,3300);assert.equal(changed.valor,36300);assert(s.writes.some(([,id,row])=>id==='row'&&row.autoPriceV1.policy.limits.m3===10));
});
