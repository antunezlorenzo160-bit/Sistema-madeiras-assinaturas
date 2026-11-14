import test from 'node:test';import assert from 'node:assert/strict';
import {normalizePricePolicy,applyDocumentPrices,catalogPricePair,documentQuantities} from '../public/document-pricing.mjs';
const p={enabled:true,limits:{m3:1,m2:10,linear:20}};
const item=(id,v,extra={})=>({id,madeira:id,tipoMedida:'m3',volume:v,preco:100,autoPriceV1:{policy:p,retail:100,wholesale:80},...extra});
test('sums species per document; inclusive retail boundary switches every item only above threshold',()=>{
 const a=item('A',.4),b=item('B',.6);assert.deepEqual(applyDocumentPrices([a,b]).map(i=>i.preco),[100,100]);
 const c=item('C',.01);assert.deepEqual(applyDocumentPrices([a,b,c]).map(i=>i.preco),[80,80,80]);
 assert.deepEqual(applyDocumentPrices([a,c]).map(i=>i.preco),[100,100]);
});
test('units stay separate, granel uses m3 and physical volume excludes CMDP allowance',()=>{
 const a=item('A',.7,{volumeReal:.5}),b=item('B',.5,{tipoMedida:'granel'}),area=item('C',10,{tipoMedida:'m2'}),linear=item('D',21,{tipoMedida:'linear'});
 assert.deepEqual(documentQuantities([a,b,area,linear]),{m3:1,m2:10,linear:21});
 assert.deepEqual(applyDocumentPrices([a,b,area,linear]).map(i=>i.priceTierV1),['varejo','varejo','varejo','atacado']);
});
test('disabled or blank unit limits keep retail; zero threshold explicitly allows wholesale',()=>{
 assert.deepEqual(normalizePricePolicy(),{enabled:false,limits:{},revision:0});
 const i=item('A',3);i.autoPriceV1.policy=normalizePricePolicy({enabled:true,limits:{m3:''}});assert.equal(applyDocumentPrices([i])[0].preco,100);
 i.autoPriceV1.policy=normalizePricePolicy({enabled:true,limits:{m3:0}});assert.equal(applyDocumentPrices([i])[0].preco,80);
 assert.throws(()=>normalizePricePolicy({limits:{m3:-1}}));assert.throws(()=>normalizePricePolicy({limits:{m2:'NaN'}}));
});
test('legacy documents and locked snapshots never reprice; absent wholesale remains retail with explicit warning',()=>{
 const old={id:'old',volume:2,preco:150};assert.strictEqual(applyDocumentPrices([old])[0],old);
 const locked=item('L',2);locked.autoPriceV1.locked=true;assert.strictEqual(applyDocumentPrices([locked])[0],locked);
 const i=item('A',2);i.autoPriceV1.wholesale=0;const result=applyDocumentPrices([i])[0];assert.equal(result.preco,100);assert.match(result.priceWarningV1,/não cadastrado/);
});
test('catalog picks matching thickness/width and applies length percentage to both prices',()=>{
 const catalog={bitolas:[{espessuraRegra:'2,5 5',precoVarejo:100,precoAtacado:80,regrasLargura:[{larguraRegra:'15 20',precoVarejo:120,precoAtacado:90}],regrasComprimento:[{acimaDe:4,percentual:10}]}]};
 assert.deepEqual(catalogPricePair({espessura:5,largura:15,comprimento:4},catalog),{retail:132,wholesale:99});
 assert.deepEqual(catalogPricePair({espessura:5,largura:10,comprimento:3},catalog),{retail:100,wholesale:80});
});
test('m2, linear, granel and green wood keep their matching price sources',()=>{
 assert.deepEqual(catalogPricePair({tipoMedida:'linear',produto:'Rodapé'},{regrasLinear:[{tipo:'Rodapé',precoVarejo:12,precoAtacado:10}]}),{retail:12,wholesale:10});
 assert.deepEqual(catalogPricePair({tipoMedida:'m2',largura:9,comprimento:3},{regrasM2:[{larguras:'9',acimaDe:2,precoVarejo:40,precoAtacado:30}]}),{retail:40,wholesale:30});
 assert.deepEqual(catalogPricePair({tipoMedida:'granel'},{preco:80,precoAtacado:60}),{retail:80,wholesale:60});
 assert.equal(catalogPricePair({estadoMadeira:'verde',preco:200},{}).locked,true);
});
test('preview load repricing retains service charges at wholesale and preserves old completed prices',async()=>{
 const {readFileSync}=await import('node:fs'),vm=await import('node:vm'),{priceLoadServices}=await import('../public/load-sales.mjs');
 const writes=[],c={setTimeout(){},normalizePricePolicy,applyDocumentPrices,priceLoadServices,window:{__v456Local:{getItem:()=>null,setItem(){}}},parent:{__smEmployeeMember:()=>({papel:'admin'})},enfileirarOffline:(...args)=>writes.push(args),lancamentos:[],COL:{cargas:'loads'},STORAGE:{lancamentos:'summary'}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/preview-pricing.js',import.meta.url),'utf8'),c);
 const row=priceLoadServices(item('new',2,{cargaStatus:'montagem',grupoCargaId:'draft',endireitamento:true,precoEndireitamento:10}));
 const priced=c.updatePricedRowsV710([row],'loads')[0];assert.equal(priced.preco,80);assert.equal(priced.valorMaterial,160);assert.equal(priced.valorServicos,16);assert.equal(priced.valor,176);assert.equal(writes.length,1);
 const closed=item('closed',2,{grupoCargaId:'closed',cargaStatus:'concluido',cargaBaixadaEm:1,valor:220,endireitamento:true,precoEndireitamento:10});c.carregamentos=[closed];c.repriceLoadsV710();assert.equal(c.carregamentos[0].valor,220);assert.equal(writes.length,1);
 const locked=item('locked',2,{valor:220});locked.autoPriceV1.locked=true;assert.equal(c.updatePricedRowsV710([locked],'loads')[0].valor,220);
});
test('legacy catalog without a thickness table still supplies its registered wholesale price',()=>{
 assert.deepEqual(catalogPricePair({tipoMedida:'m3',preco:2500,espessura:5},{preco:2500,precoAtacado:2200}),{retail:2500,wholesale:2200});
});
