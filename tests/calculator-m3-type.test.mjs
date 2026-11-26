import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {m3TypeChoicesV829,catalogPricePair} from '../public/document-pricing.mjs';
const bits=[{estruturaV347:true,espessuraRegra:'2,5',tipo:'Tábua',precoVarejo:2000,precoAtacado:1800,regrasLargura:[{larguraRegra:'20',precoVarejo:2100,precoAtacado:1900}],regrasComprimento:[{acimaDe:'5',percentual:10}]},{estruturaV347:true,espessuraRegra:'2,5',tipo:'Forro',precoVarejo:3000,precoAtacado:2800,regrasLargura:[],regrasComprimento:[]},{espessuraRegra:'5',tipo:'Prancha',precoVarejo:4000}];
function setup(){
 const nodes={calcMadeira:{value:'wood'},espessura:{value:'2.5'},largura:{value:'20'},comprimento:{value:'5.5'},precoM3:{value:0},precoBitolaAoLado:{textContent:'',classList:{add(){},remove(){},toggle(){}}},calcTipoM3V829:{value:'',dataset:{},innerHTML:'',disabled:false,addEventListener(event,fn){this.change=fn;}}};let previews=0;
 const c={document:{getElementById:id=>nodes[id]},$:id=>nodes[id],madeiras:[{id:'wood',bitolas:bits}],m3TypeChoicesV829,normalizarBitolasCadastroV347:x=>x,esc:x=>String(x).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),modoMedida:'m3',moeda:String,regraListaContemNumeroV349:(s,n)=>String(s).replaceAll(',','.').split(/\s+/).some(x=>Number(x)===n),regraComprimentoAplicavelV349:(rules,n)=>(rules||[]).filter(r=>n>=Number(r.acimaDe)).at(-1),calcPreview:()=>previews++};vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/calculator-m3-type.js',import.meta.url),'utf8'),c);
 const raw=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),app=JSON.parse(raw.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]),a=app.indexOf('function atualizarPrecoBitolaCalculadora(){'),b=app.indexOf('\n}',a)+2;vm.runInContext(app.slice(a,b),c);return {c,nodes,previews:()=>previews};
}
test('registered m³ types follow thickness and choose matching retail and wholesale rules',()=>{
 assert.deepEqual(m3TypeChoicesV829(bits,2.5),['Tábua','Forro']);assert.deepEqual(m3TypeChoicesV829(bits,5),['Prancha']);assert.deepEqual(m3TypeChoicesV829(bits,0),[]);
 assert.deepEqual(catalogPricePair({tipoMedida:'m3',tipoBitolaV829:'Forro',espessura:2.5,largura:20,comprimento:5.5},{bitolas:bits}),{retail:3000,wholesale:2800});
 assert.deepEqual(catalogPricePair({tipoMedida:'m3',tipoBitolaV829:'Tábua',espessura:2.5,largura:20,comprimento:5.5},{bitolas:bits}),{retail:2310,wholesale:2090});
});
test('actual calculator selector changes price, auto-selects one type, and preserves thickness text',()=>{
 const s=setup();s.c.atualizarPrecoBitolaCalculadora();assert.equal(s.nodes.precoM3.value,0);assert.match(s.c.calcTypeValidateV829(),/Selecione/);s.nodes.calcTipoM3V829.value='Forro';s.nodes.calcTipoM3V829.change();assert.equal(s.nodes.precoM3.value,3000);assert.equal(s.nodes.espessura.value,'2.5');assert.equal(s.c.calcTypeValidateV829(),'');s.nodes.calcTipoM3V829.value='Tábua';s.nodes.calcTipoM3V829.change();assert.equal(s.nodes.precoM3.value,2310);
 s.nodes.espessura.value='5';s.c.atualizarPrecoBitolaCalculadora();assert.equal(s.nodes.calcTipoM3V829.value,'Prancha');assert.equal(s.nodes.precoM3.value,4000);assert(s.previews()>0);
});
test('untyped legacy catalog keeps its price and changing species clears a stale type',()=>{
 const s=setup();s.c.madeiras.push({id:'old',preco:1500});s.nodes.calcTipoM3V829.value='Forro';s.c.calcTypeRefreshV829();s.nodes.calcMadeira.value='old';s.c.atualizarPrecoBitolaCalculadora();assert.equal(s.nodes.calcTipoM3V829.value,'');assert.equal(s.nodes.calcTipoM3V829.disabled,true);assert.equal(s.nodes.precoM3.value,1500);assert.equal(s.c.calcTypeValidateV829(),'');
});

test('species base prices cover unregistered thicknesses and preserve custom rates',()=>{
 const s=setup();
 const wood=s.c.madeiras[0];
 wood.precoBaseVarejoM3=1800;
 wood.precoBaseAtacadoM3=1500;
 s.c.atualizarPrecoBitolaCalculadora();
 assert.equal(s.nodes.precoM3.value,0,'registered types still require a choice');
 s.nodes.espessura.value='3';
 s.c.atualizarPrecoBitolaCalculadora();
 assert.equal(s.nodes.precoM3.value,1800);
 assert.deepEqual(catalogPricePair({espessura:3},wood),{retail:1800,wholesale:1500});
 assert.deepEqual(catalogPricePair({espessura:5},wood),{retail:4000,wholesale:1500});
 assert.deepEqual(catalogPricePair({espessura:2.5,tipoBitolaV829:'Tábua',largura:20,comprimento:5.5},wood),{retail:2310,wholesale:2090});

 wood.bitolas=[];
 s.c.atualizarPrecoBitolaCalculadora();
 assert.equal(s.nodes.precoM3.value,1800);
 assert.deepEqual(catalogPricePair({espessura:3},wood),{retail:1800,wholesale:1500});
});
