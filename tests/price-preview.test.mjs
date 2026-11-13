import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {normalizePricePolicy,applyDocumentPrices,catalogPricePair,documentQuantities,priceUnit} from '../public/document-pricing.mjs';
import {priceLoadServices} from '../public/load-sales.mjs';
const policy={enabled:true,limits:{m3:10},revision:1};
function setup({volume=29.2285,wholesale=2200,snapshot=policy,legacy=false,enabled=true}={}){
 const nodes={},writes=[],local=new Map();
 const element=(id='')=>({id,value:'',textContent:'',title:'',children:[],remove(){delete nodes[this.id];},classList:{toggle(){}},append(...children){this.children.push(...children);for(const child of children)if(child?.id)nodes[child.id]=child;}});
 for(const [id,value] of Object.entries({calcMadeira:'wood',largura:'',espessura:'5',comprimento:'5.5',quantidade:'1',precoM3:'2500'})){nodes[id]=element(id);nodes[id].value=value;}
 nodes.precoBitolaAoLado=element('precoBitolaAoLado');nodes.precoBitolaAoLado.textContent='R$ 2.500,00/m³';nodes.previewValor=element('previewValor');nodes.previewValor.parentElement=element();
 const row={id:'row',madeiraId:'wood',madeira:'Garapeira',tipoMedida:'m3',espessura:5,largura:10,comprimento:5.5,quantidade:1,volume,preco:2500,valor:volume*2500,cargaStatus:'montagem',grupoCargaId:'current',...(legacy?{}:{autoPriceV1:{retail:2500,wholesale,policy:snapshot}})};
 const c={normalizePricePolicy,applyDocumentPrices,catalogPricePair,documentQuantities,priceUnit,priceLoadServices,setTimeout(){},window:{__v456Local:{getItem:k=>local.get(k),setItem:(k,v)=>local.set(k,v)}},parent:{__smEmployeeMember:()=>({papel:'admin'})},document:{getElementById:id=>nodes[id]||null,createElement:()=>element(),createTextNode:text=>({textContent:text})},$:id=>nodes[id]||null,modoMedida:'m3',destinoSelecionado:()=> 'carga',sessaoCargaAtual:'current',carregamentos:volume?[row]:[],lancamentos:volume?[{...row}]:[],orcamento:[],madeiras:[{id:'wood',nome:'Garapeira',bitolas:[{espessura:5,precoVarejo:2500,precoAtacado:wholesale}]}],normalizarBitolasCadastroV347:x=>x,moeda:n=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),servicosM3:{endireitamento:0,aplainamento:0},COL:{cargas:'loads'},STORAGE:{lancamentos:'summary'},enfileirarOffline:(...args)=>writes.push(args),renderLancamentos(){},calcPreview(){},sincronizarOfflineOps:async()=>{}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/preview-pricing.js',import.meta.url),'utf8'),c);vm.runInContext('pricePolicyV710='+JSON.stringify({...policy,enabled}),c);
 return {c,nodes,writes,row,local};
}
test('29 m3 with a blank width updates the actual load and visible wholesale price without creating a panel',()=>{
 const s=setup();s.c.previewDocumentValueV710();assert.match(s.nodes.precoBitolaAoLado.textContent,/2\.200,00/);assert.equal(s.nodes.precoBitolaAoLado.title,'Preço de atacado');assert.match(s.nodes.previewValor.textContent,/0,00/);assert.equal(s.nodes.precoM3.value,'2500');assert.equal(s.c.carregamentos[0].preco,2200);assert.equal(s.c.carregamentos[0].valor,29.2285*2200);assert.equal(s.nodes.pricePreviewV710,undefined);assert.equal(s.nodes.previewValor.parentElement.children.length,0);assert(s.writes.length>0);
 const count=s.writes.length;s.c.previewDocumentValueV710();assert.equal(s.writes.length,count,'re-render must not enqueue the same price again');
});
test('the boundary stays retail, and a candidate that crosses it previews wholesale',()=>{
 const exact=setup({volume:10});exact.c.previewDocumentValueV710();assert.equal(exact.nodes.precoBitolaAoLado.title,'Preço de varejo');
 const s=setup({volume:9.99});s.nodes.largura.value='10';s.c.previewDocumentValueV710();assert.equal(s.nodes.precoBitolaAoLado.title,'Preço de atacado');assert.match(s.nodes.previewValor.textContent,/60,50/);assert.equal(s.c.carregamentos[0].preco,2500);
});
test('missing wholesale never invents a discount and no explanatory panel is added',()=>{
 const s=setup({wholesale:0});s.c.previewDocumentValueV710();assert.match(s.nodes.precoBitolaAoLado.textContent,/2\.500,00/);assert.match(s.nodes.precoBitolaAoLado.title,/atacado não cadastrado/);assert.equal(s.nodes.pricePreviewV710,undefined);
});
test('current limits apply automatically only to the active unfinished load, not another draft or a closed load',()=>{
 const s=setup({volume:15,snapshot:{...policy,limits:{m3:20}}}),saved={...s.row,id:'saved',grupoCargaId:'saved',cargaStatus:'concluido',cargaBaixadaEm:1,preco:3000,valor:45000},other={...s.row,id:'other',grupoCargaId:'other',preco:3000,valor:45000,autoPriceV1:{retail:3000,wholesale:2800,policy:{...policy,limits:{m3:20}}}};
 s.c.carregamentos.push(saved,other);s.c.previewDocumentValueV710();assert.equal(s.c.carregamentos[0].preco,2200);assert.equal(s.c.carregamentos[0].autoPriceV1.policy.limits.m3,10);assert.equal(s.c.carregamentos[1].preco,3000);assert.equal(s.c.carregamentos[2].preco,3000);assert.equal(s.c.carregamentos[2].autoPriceV1.policy.limits.m3,20);
});
test('activating the checkbox adopts the existing current load without a separate apply button',()=>{
 const s=setup({legacy:true,volume:10.4748,enabled:false});s.c.previewDocumentValueV710();assert.equal(s.c.carregamentos[0].preco,2500);assert.equal(s.c.carregamentos[0].autoPriceV1,undefined);assert.equal(s.writes.length,0);assert.equal(s.nodes.pricePreviewV710,undefined);
 vm.runInContext('pricePolicyV710.enabled=true',s.c);s.c.previewDocumentValueV710();assert.equal(s.c.carregamentos[0].preco,2200);assert.equal(s.c.carregamentos[0].autoPriceV1.policy.limits.m3,10);
});
test('leaving sales restores the base rate, and green locked prices stay fixed on automatic adoption',()=>{
 const s=setup();s.c.previewDocumentValueV710();s.c.destinoSelecionado=()=> 'estoque1';s.c.previewDocumentValueV710();assert.match(s.nodes.precoBitolaAoLado.textContent,/2\.500,00/);
 const green=setup({legacy:true}),locked={...green.row,id:'green',estadoMadeira:'verde',preco:1800,valor:1800,autoPriceV1:{retail:1800,wholesale:0,locked:true,policy:{...policy,limits:{m3:50}}}};green.c.carregamentos.unshift(locked);green.c.repriceLoadsV710();assert.equal(green.c.carregamentos[0].preco,1800);assert.equal(green.c.carregamentos[0].autoPriceV1.policy.limits.m3,10);assert.equal(green.c.carregamentos[1].preco,2200);
});
test('automatic adoption retains processing surcharge and persists new policy metadata',()=>{
 const s=setup({volume:15,legacy:true});s.c.carregamentos[0]=priceLoadServices({...s.row,endireitamento:true,precoEndireitamento:10,servicePricingV727:true});s.c.repriceLoadsV710();const changed=s.c.carregamentos[0];assert.equal(changed.preco,2200);assert.equal(changed.valorMaterial,33000);assert.equal(changed.valorServicos,3300);assert.equal(changed.valor,36300);assert(s.writes.some(([,id,row])=>id==='row'&&row.autoPriceV1.policy.limits.m3===10));
});

test('offline linear type selection previews prices repeatedly without repricing drafts, queue writes or storage rewrites',()=>{
 const s=setup(),rules=[{tipo:'Ripa',precoVarejo:12,precoAtacado:9},{tipo:'Rodapé',precoVarejo:20,precoAtacado:15}],linearPolicy={enabled:true,limits:{linear:10,m3:10},revision:1};
 vm.runInContext('pricePolicyV710='+JSON.stringify(linearPolicy),s.c);s.c.carregamentos[0].grupoCargaId='other';s.c.navigator={onLine:false};s.c.modoMedida='linear';s.c.madeiras.push({id:'linear-wood',tipoCadastro:'linear',nome:'Pinus',regrasLinear:rules});s.nodes.calcMadeira.value='linear-wood';s.nodes.comprimento.value='2';s.nodes.quantidade.value='1';s.nodes.precoTipoLinear={textContent:''};let chosen=0;s.c.regraLinearSelecionadaV381=()=>rules[chosen];s.c.selecionarServicosLinear=()=>({});s.c.cobrarServicosLinear=i=>({...i,valor:i.volume*i.preco});
 s.c.carregamentos.push({id:'linear-row',madeiraId:'linear-wood',tipoMedida:'linear',produto:'Ripa',comprimento:2,quantidade:6,volume:12,preco:12,valor:144,cargaStatus:'montagem',grupoCargaId:'current',autoPriceV1:{retail:12,wholesale:9,policy:linearPolicy}});
 const before=JSON.stringify(s.c.carregamentos);for(let i=0;i<30;i++){chosen=i%2;s.c.previewDocumentValueV710();assert.match(s.nodes.precoTipoLinear.textContent,chosen?/15,00/:/9,00/);assert.match(s.nodes.previewValor.textContent,chosen?/30,00/:/18,00/);}
 assert.equal(s.writes.length,0);assert.equal(s.local.size,0);assert.equal(JSON.stringify(s.c.carregamentos),before);
 // The existing launch/render path still applies wholesale to real saved lines.
 s.c.repriceLoadsV710();assert(s.writes.length>0);assert.equal(s.c.carregamentos.find(i=>i.id==='linear-row').preco,9);
});
