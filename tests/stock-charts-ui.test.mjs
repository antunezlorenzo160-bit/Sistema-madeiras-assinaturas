import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup(allowed=true){
 const nodes={};const html=readFileSync(new URL('../ui/stock-charts.html',import.meta.url),'utf8');
 for(const [,id] of html.matchAll(/id="([^"]+)"/g))nodes[id]={id,value:'',hidden:false,dataset:{},open:false,scrollLeft:0,innerHTML:'',textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},querySelector(){return null;}};
 nodes.scStockV720.value='estoque1';nodes.scKindV720.value='m3';nodes.scGroupV720.value='day';
 const pending=[],calls=[];const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const today=new Date(),day=String(today.getDate()).padStart(2,'0')+'/'+String(today.getMonth()+1).padStart(2,'0')+'/'+today.getFullYear();
 const c={Date,console,navigator:{onLine:true},parent:{__smEmployeeCan:area=>{assert.equal(area,'stock');return allowed;}},window:{addEventListener(){}},document:{getElementById:id=>nodes[id]||null},queueMicrotask,setTimeout:fn=>pending.push(fn),esc,abrirHistoricoMovimentosV701:()=>calls.push('existing-lazy-history'),estoquePlanilhaAtivo:'estoque1',estoqueTipo:'m3',historicoEstoqueAtivo:'estoque1',historicoTipo:'m3',estoque1Lancamentos:[{madeira:'Garapeira',volume:1.5},{madeira:'Deck',tipoMedida:'m2',volume:20}],estoque2Lancamentos:[{madeira:'<img onerror="bad">',volume:4}],movimentos:[{origem:'Estoque 1',tipo:'entrada',tipoCadastro:'m3',madeira:'Garapeira',data:day,volume:3},{origem:'Estoque 2',tipo:'saida',tipoCadastro:'m3',madeira:'<img onerror="bad">',data:day,volume:5}]};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../public/stock-charts.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../ui/stock-charts.js',import.meta.url),'utf8'),c);pending.forEach(fn=>fn());return {c,nodes,calls};
}
test('closed charts do not request history; opening and changing stock use current rows without writes',async()=>{
 const {c,nodes,calls}=setup(),before=JSON.stringify([c.estoque1Lancamentos,c.estoque2Lancamentos,c.movimentos]);assert.equal(calls.length,0);
 nodes.stockChartsV720.open=true;nodes.stockChartsV720.handlers.toggle();await Promise.resolve();assert.equal(calls.length,1);assert.match(nodes.scStatsV720.innerHTML,/1,5000 m³/);assert.match(nodes.scMovementV720.innerHTML,/<svg/);assert.match(nodes.scMovementTableV720.innerHTML,/3,0000 m³/);
 nodes.scStockV720.value='estoque2';nodes.scStockV720.handlers.change();await Promise.resolve();assert.match(nodes.scStatsV720.innerHTML,/4,0000 m³/);assert.match(nodes.scMovementTableV720.innerHTML,/5,0000 m³/);assert(!nodes.scInventoryV720.innerHTML.includes('<img'));assert.match(nodes.scInventoryV720.innerHTML,/&lt;img/);assert.equal(calls.length,1);assert.equal(JSON.stringify([c.estoque1Lancamentos,c.estoque2Lancamentos,c.movimentos]),before);
});
test('unit and date controls rerender, invalid ranges hide results, offline and refreshed data stay visible',async()=>{
 const {c,nodes}=setup();nodes.stockChartsV720.open=true;nodes.stockChartsV720.handlers.toggle();await Promise.resolve();nodes.scKindV720.value='m2';nodes.scKindV720.handlers.change();await Promise.resolve();assert.match(nodes.scStatsV720.innerHTML,/20,00 m²/);assert.match(nodes.scMovementV720.innerHTML,/Nenhuma entrada/);
 nodes.scToV720.value='2000-01-01';nodes.scToV720.handlers.change();await Promise.resolve();assert.equal(nodes.scResultsV720.hidden,true);assert.equal(nodes.scErrorV720.hidden,false);
 nodes.scToV720.value=nodes.scFromV720.value;nodes.scToV720.handlers.change();await Promise.resolve();assert.equal(nodes.scResultsV720.hidden,false);
 c.navigator.onLine=false;c.estoque1Lancamentos.push({madeira:'Novo',tipoMedida:'m2',volume:2});c.queueStockChartsV720();await Promise.resolve();assert.match(nodes.scSyncV720.textContent,/Sem internet/);assert.match(nodes.scStatsV720.innerHTML,/22,00 m²/);
});
test('employee without stock permission cannot open charts or request history',()=>{
 const {nodes,calls,c}=setup(false);assert.equal(nodes.stockChartsV720.hidden,true);assert.equal(calls.length,0);nodes.stockChartsV720.open=true;c.renderStockChartsV720();assert.equal(nodes.scInventoryV720.innerHTML,'');assert.equal(calls.length,0);
});

test('selecting a chart period opens its numeric table and reports that period',async()=>{
 const {nodes}=setup();nodes.stockChartsV720.open=true;nodes.stockChartsV720.handlers.toggle();await Promise.resolve();
 const key=nodes.scToV720.value;nodes.stockChartsV720.handlers.click({target:{closest:()=>({dataset:{chartPeriod:key}})}});
 assert.equal(nodes.scMovementDetailsV720.open,true);assert.match(nodes.scSelectedV720.textContent,/Entradas: 3,0000 m³/);assert.match(nodes.scMovementV720.innerHTML,/sc-period sc-selected/);
});

test('narrow movement chart keeps every day while fitting the available phone width',()=>{
 const {c}=setup();const rows=Array.from({length:93},(_,i)=>({key:new Date(Date.UTC(2026,10,1+i)).toISOString().slice(0,10),in:i+1,out:i/2}));
 const svg=c.movementChartMarkupV720(rows,'m3',310);assert.match(svg,/viewBox="0 0 308 210"/);assert.equal((svg.match(/data-chart-period=/g)||[]).length,93);
 const rectangles=[...svg.matchAll(/<rect class="sc-(?:in|out)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];assert.equal(rectangles.length,186);
 for(const [,x,y,width,height] of rectangles){assert(Number(x)>=52);assert(Number(x)+Number(width)<=300);assert(Number(y)>=14.99);assert(Number(height)>=0);}
});
