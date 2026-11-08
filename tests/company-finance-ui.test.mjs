import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
function setup(){
 const nodes={},fields=[];for(const [,id] of readFileSync(new URL('../ui/company-finance.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g))nodes[id]={id,value:'',hidden:false,disabled:false,innerHTML:'',textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll:()=>fields,scrollIntoView(){}};
 const inputs=['finTypeV722','finDateV722','finDescriptionV722','finPartnerV722','finReferenceV722','finCategoryV722','finAmountV722','finCostV722'];fields.push(...inputs.map(id=>nodes[id]),nodes.finSaveV722,nodes.finNewV722);
 nodes.finFormV722.reset=()=>{for(const id of inputs)nodes[id].value='';nodes.finTypeV722.value='purchase';nodes.finCategoryV722.value='wood';};
 nodes.finGroupV722.value='month';let fetchImpl;const calls=[],timers=[],member={papel:'admin'},user={uid:'owner',getIdToken:async()=> 'token'};
 const c={console,Date,AbortSignal,URLSearchParams,crypto:{randomUUID},navigator:{onLine:true},parent:{__smEmployeeMember:()=>member},authV456:{currentUser:user},empresaV456:'tenant',document:{getElementById:id=>nodes[id]||null},esc:s=>String(s).replace(/[<>&"']/g,'_'),stockChartLabelV720:key=>key.split('-').reverse().join('/'),confirm:()=>true,setTimeout:fn=>timers.push(fn),fetch:async(url,options)=>{calls.push({url,options});return fetchImpl(url,options);}};
 vm.createContext(c);const pure=['stock-charts.mjs','company-finance.mjs','load-sales.mjs','minimum-profit.mjs','opening-stock-cost.mjs','finance-reconciliation.mjs'].map(p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','')).join('\n');vm.runInContext(pure+'\n'+readFileSync(new URL('../ui/company-finance.js',import.meta.url),'utf8'),c);timers.forEach(fn=>fn());nodes.finFromV722.value='2026-11-01';nodes.finToV722.value='2026-11-30';
 return {c,nodes,calls,member,setRequest:fn=>{fetchImpl=fn;}};
}
const response=(data,status=200)=>({ok:status<300,json:async()=>data});
test('financial data is loaded only on demand; actual consulted range is shown independently of draft filters',async()=>{
 const s=setup();assert.equal(s.calls.length,0);s.setRequest(async()=>response({empresaId:'tenant',entries:[],canWrite:true,preview:true}));await s.c.financeLoadV722();assert.equal(s.nodes.finPreviewV722.hidden,false);assert.match(s.nodes.finShownPeriodV722.textContent,/01\/11\/2026.*30\/11\/2026/);assert.equal(s.nodes.finSaveV722.disabled,false);
 s.nodes.finToV722.value='2026-12-31';s.nodes.finToV722.onchange();assert.match(s.nodes.finStatusV722.textContent,/Consultar/);assert.match(s.nodes.finShownPeriodV722.textContent,/30\/11\/2026/);
});
test('failed save retains the form and stable id; retry cannot create a second logical transaction',async()=>{
 const s=setup();s.setRequest(async()=>response({empresaId:'tenant',entries:[],canWrite:true}));await s.c.financeLoadV722();Object.assign(s.nodes.finTypeV722,{value:'sale'});s.nodes.finDescriptionV722.value='Venda';s.nodes.finAmountV722.value='500,00';s.nodes.finCostV722.value='300,00';s.nodes.finDateV722.value='2026-11-07';
 let first=true,stored;s.setRequest(async(url,options)=>{const entry=JSON.parse(options.body).entry;if(first){first=false;stored=entry;throw Error('Resposta perdida');}assert.equal(entry.id,stored.id);return response({empresaId:'tenant',entry:{...entry,status:'active',revision:1}});});
 await s.c.financeSaveV722({preventDefault(){}});assert.equal(s.nodes.finAmountV722.value,'500,00');assert.match(s.nodes.finWriteStatusV722.textContent,/preservado/);await s.c.financeSaveV722({preventDefault(){}});assert.match(s.nodes.finWriteStatusV722.textContent,/salvo/);assert.match(s.nodes.finStatsV722.innerHTML,/200,00/);assert.equal(vm.runInContext('financeRowsV722.length',s.c),1);assert.equal(stored.amountCents,50000);assert.equal(stored.costCents,30000);
});
test('missing sale cost remains pending and offline writes retain data without sending requests',async()=>{
 const s=setup();s.setRequest(async()=>response({empresaId:'tenant',entries:[],canWrite:true}));await s.c.financeLoadV722();s.nodes.finTypeV722.value='sale';s.nodes.finDescriptionV722.value='Venda sem custo';s.nodes.finAmountV722.value='10,00';s.nodes.finDateV722.value='2026-11-07';assert.equal(s.c.financeEntryV722().costCents,null);
 s.c.navigator.onLine=false;const calls=s.calls.length;await s.c.financeSaveV722({preventDefault(){}});assert.equal(s.calls.length,calls);assert.equal(s.nodes.finDescriptionV722.value,'Venda sem custo');assert.match(s.nodes.finWriteStatusV722.textContent,/internet/);
});
test('a non-owner cannot read financial records even when directly calling the client helper',async()=>{
 const s=setup();s.member.papel='employee';await assert.rejects(s.c.financeRequestV722(null,{from:'2026-11-01',to:'2026-11-30'}),/exclusivo/);assert.equal(s.calls.length,0);
});
function automaticSale(extra={}){return {id:'8a58eaf9-6084-4bb0-b68e-062fcf477f4b',revision:0,type:'sale',date:'2026-11-07',description:'Venda da carga',partner:'Cliente',reference:'Carga A',category:'wood',amountCents:50000,costCents:null,status:'active',source:{type:'load-sale',loadId:'load',signature:'a'.repeat(64),physicalSignature:'b'.repeat(64),subtotalCents:50000,freightCents:0,discountCents:0,otherCents:0},...extra};}
function saleRoot(row,choice=null){const fields={cost:{value:'300,00'},include:{checked:true},manual:choice===null?null:{value:choice},status:{textContent:''}};return {dataset:{loadSale:row.id},fields,querySelector:selector=>({'[data-load-sale-cost]':fields.cost,'[data-load-sale-include]':fields.include,'[data-load-sale-manual]':fields.manual,'[data-load-sale-status]':fields.status}[selector]),querySelectorAll:()=>Object.values(fields).filter(Boolean)};}
test('completed load revenue is shown automatically; only the missing wood cost is posted to its endpoint',async()=>{
 const s=setup(),row=automaticSale();s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true,preview:true}));await s.c.financeLoadV722();assert.match(s.nodes.finStatsV722.innerHTML,/500,00/);assert.match(s.nodes.finStatsV722.innerHTML,/Pendente/);assert.match(s.nodes.finEntriesV722.innerHTML,/Venda vinculada/);
 const root=saleRoot(row);s.setRequest(async(url,options)=>{assert.match(url,/company-load-sale$/);assert.equal(s.nodes.finGroupV722.disabled,true);const input=JSON.parse(options.body);assert.equal(input.costCents,30000);assert.equal(input.signature,row.source.signature);assert(!Object.hasOwn(input,'amountCents'));return response({empresaId:'tenant',entry:{...row,costCents:30000,revision:1}});});await s.c.financeSaveLoadSaleV724(root);assert.match(s.nodes.finStatsV722.innerHTML,/200,00/);assert(!s.nodes.finStatsV722.innerHTML.includes('Pendente'));
});
test('matching manual sale is not counted twice and requires an explicit replacement choice',async()=>{
 const s=setup(),row=automaticSale(),manual={id:'1a58eaf9-6084-4bb0-b68e-062fcf477f4b',revision:1,type:'sale',date:row.date,description:'Venda manual',amountCents:50000,costCents:30000,status:'active'};
 s.setRequest(async()=>response({empresaId:'tenant',entries:[row,manual],canWrite:true}));await s.c.financeLoadV722();assert.match(s.nodes.finPendingV722.textContent,/duplicada/);const root=saleRoot(row,'__choose__'),calls=s.calls.length;await s.c.financeSaveLoadSaleV724(root);assert.equal(s.calls.length,calls);assert.match(root.fields.status.textContent,/Escolha/);
 root.fields.manual.value=manual.id;s.setRequest(async(url,options)=>{const input=JSON.parse(options.body);assert.equal(input.resolution,'replace');assert.equal(input.manualEntry.id,manual.id);return response({empresaId:'tenant',entry:{...row,costCents:30000,revision:1,source:{...row.source,manualEntryId:manual.id}},manualEntry:{...manual,status:'cancelled',revision:2}});});await s.c.financeSaveLoadSaleV724(root);assert.match(s.nodes.finStatsV722.innerHTML,/200,00/);assert(!s.nodes.finStatsV722.innerHTML.includes('Pendente'));
});
test('expenses beyond the sale margin show automatic deficit without a second loss deduction',async()=>{
 const s=setup(),entries=[{...automaticSale(),source:undefined,amountCents:2000000,costCents:1300000},{id:'expense',date:'2026-11-07',type:'expense',status:'active',amountCents:800000,costCents:null,description:'Gastos'}];
 s.setRequest(async()=>response({empresaId:'tenant',entries,canWrite:true}));await s.c.financeLoadV722();assert.match(s.nodes.finOtherStatsV735.innerHTML,/Margem antes das despesas[\s\S]*7\.000,00/);assert.match(s.nodes.finStatsV722.innerHTML,/Resultado calculado[\s\S]*fin-negative[\s\S]*1\.000,00/);assert.match(s.nodes.finPendingV722.textContent,/despesas ultrapassaram a margem/);assert.match(s.nodes.finChartV722.innerHTML,/Prejuízo/);assert(!s.nodes.finStatsV722.innerHTML.includes('Perdas de madeira'));assert.equal(s.calls.length,1);
});
test('company target warns on a profitable low-price sale and remains pending for unknown costs',async()=>{
 const s=setup(),row=automaticSale({amountCents:11000,costCents:10000});s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true,profitPolicy:{minimumBasisPoints:2000,revision:1}}));await s.c.financeLoadV722();assert.match(s.nodes.finEntriesV722.innerHTML,/Abaixo do mínimo da empresa/);assert.match(s.nodes.finEntriesV722.innerHTML,/120,00/);assert.match(s.nodes.finOtherStatsV735.innerHTML,/Lucro mínimo esperado/);assert.match(s.nodes.finMinimumSummaryV726.textContent,/1 venda/);
 s.setRequest(async()=>response({empresaId:'tenant',entries:[{...row,costCents:null}],canWrite:true,profitPolicy:{minimumBasisPoints:2000,revision:1}}));await s.c.financeLoadV722();assert(!s.nodes.finEntriesV722.innerHTML.includes('Abaixo do mínimo da empresa'));assert.match(s.nodes.finEntriesV722.innerHTML,/avaliação pendente/);
});
test('period expenses can put the result below target even when sale price meets the minimum',async()=>{
 const s=setup(),row=automaticSale({amountCents:13000,costCents:10000}),expense={id:'expense',date:'2026-11-07',type:'expense',status:'active',amountCents:1500,costCents:null,description:'Gastos'};s.setRequest(async()=>response({empresaId:'tenant',entries:[row,expense],canWrite:true,profitPolicy:{minimumBasisPoints:2000,revision:1}}));await s.c.financeLoadV722();assert.match(s.nodes.finEntriesV722.innerHTML,/Mínimo atendido no preço/);assert.match(s.nodes.finMinimumSummaryV726.textContent,/após as despesas/);assert.match(s.nodes.finMinimumSummaryV726.textContent,/5,00/);
});
test('saving a target refreshes warnings without changing sale values; failed save preserves percentage',async()=>{
 const s=setup(),row=automaticSale({amountCents:11000,costCents:10000});s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true}));await s.c.financeLoadV722();s.nodes.finMinimumPercentV726.value='20';
 s.setRequest(async(url,options)=>{assert.match(url,/company-profit-policy$/);assert.deepEqual(JSON.parse(options.body),{minimumBasisPoints:2000,revision:0});return response({empresaId:'tenant',policy:{minimumBasisPoints:2000,revision:1}});});await s.c.financeMinimumSaveV726();assert.match(s.nodes.finEntriesV722.innerHTML,/Abaixo do mínimo da empresa/);assert.equal(vm.runInContext('financeRowsV722[0].amountCents',s.c),11000);
 s.nodes.finMinimumPercentV726.value='35';s.setRequest(async()=>{throw Error('Sem conexão');});await s.c.financeMinimumSaveV726();assert.equal(s.nodes.finMinimumPercentV726.value,'35');assert.match(s.nodes.finMinimumStatusV726.textContent,/preservado/);
});
test('service breakdown stays within sale revenue but does not hide a low wood margin',async()=>{
 const s=setup(),row=automaticSale({amountCents:14300,costCents:10000,source:{...automaticSale().source,woodCents:11000,serviceCents:3300,pendingServiceLines:0}});
 s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true,profitPolicy:{minimumBasisPoints:2000,revision:1}}));await s.c.financeLoadV722();
 assert.match(s.nodes.finOtherStatsV735.innerHTML,/Serviços incluídos nas vendas/);assert.match(s.nodes.finEntriesV722.innerHTML,/Abaixo do mínimo da empresa/);assert.match(s.nodes.finEntriesV722.innerHTML,/sem adicional de serviços/);assert.match(s.nodes.finMinimumSummaryV726.textContent,/abaixo do lucro mínimo/);
 s.setRequest(async()=>response({empresaId:'tenant',entries:[{...row,source:{...row.source,woodCents:null,serviceCents:null,pendingServiceLines:1}}],canWrite:true,profitPolicy:{minimumBasisPoints:2000,revision:1}}));await s.c.financeLoadV722();assert.match(s.nodes.finEntriesV722.innerHTML,/pendente de separar o serviço/);assert(!s.nodes.finEntriesV722.innerHTML.includes('Mínimo atendido'));
});
test('automatic average cost is visible and saving its conference does not freeze it as a manual cost',async()=>{
 const s=setup(),row=automaticSale({costCents:115000,source:{...automaticSale().source,costMode:'average',automaticCostCents:115000}});s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true}));await s.c.financeLoadV722();
 assert.match(s.nodes.finEntriesV722.innerHTML,/Custo médio automático/);assert.match(s.nodes.finEntriesV722.innerHTML,/data-load-sale-auto checked/);
 const root=saleRoot(row),previous=root.querySelector;root.fields.cost.value='1150,00';root.querySelector=selector=>selector==='[data-load-sale-auto]'?{checked:true}:previous(selector);
 s.setRequest(async(url,options)=>{assert.equal(JSON.parse(options.body).costCents,null);return response({entry:{...row,revision:1}});});await s.c.financeSaveLoadSaleV724(root);assert.equal(s.calls.length,2);
});
test('switching from automatic cost to manual requires an explicit amount and never silently falls back',async()=>{
 const s=setup(),row=automaticSale({costCents:115000,source:{...automaticSale().source,costMode:'average',automaticCostCents:115000}});s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true}));await s.c.financeLoadV722();
 const root=saleRoot(row),previous=root.querySelector;root.fields.cost.value='';root.querySelector=selector=>selector==='[data-load-sale-auto]'?{checked:false}:previous(selector);await s.c.financeSaveLoadSaleV724(root);assert.equal(s.calls.length,1);assert.match(root.fields.status.textContent,/Informe o custo manual/);
});
test('R1000 old valuation stays a proposal until owner saves, then refreshes costs without creating a purchase',async()=>{
 const s=setup();s.setRequest(async()=>response({empresaId:'tenant',entries:[],canWrite:true}));await s.c.financeLoadV722();assert.equal(s.nodes.finOpeningUnitV732.value,'1000,00');assert.match(s.nodes.finOpeningStatusV732.textContent,/ainda não aplicado/);assert.equal(s.calls.length,1);
 const policy={unitCents:100000,cutoffAt:Date.UTC(2026,10,8),revision:1};s.setRequest(async(url,options)=>{if(options.method==='POST'){assert.match(url,/company-opening-stock-cost$/);assert.deepEqual(JSON.parse(options.body),{companyId:'tenant',unitCents:100000,revision:0});return response({empresaId:'tenant',policy});}return response({empresaId:'tenant',entries:[],canWrite:true,openingPolicy:policy});});await s.c.financeOpeningSaveV732();assert.equal(s.calls.length,3,s.nodes.finOpeningStatusV732.textContent);assert.match(s.nodes.finOpeningStatusV732.textContent,/Custo antigo salvo/);
 s.nodes.finOpeningUnitV732.value='1200,00';s.setRequest(async()=>{throw Error('Falha na conexão');});await s.c.financeOpeningSaveV732();assert.equal(s.nodes.finOpeningUnitV732.value,'1200,00');assert.match(s.nodes.finOpeningStatusV732.textContent,/preservado/);
});
test('four primary totals lead to per-sale cost explanations, while purchases and target stay in secondary totals',async()=>{
 const s=setup(),row=automaticSale({amountCents:2500000,costCents:130000,source:{...automaticSale().source,costMode:'manual',physicalM3:10,automaticCostCents:1000000}}),before=JSON.stringify(row);s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true,profitPolicy:{minimumBasisPoints:3000,revision:1}}));await s.c.financeLoadV722();
 assert.equal((s.nodes.finStatsV722.innerHTML.match(/<small>/g)||[]).length,4);assert(!s.nodes.finStatsV722.innerHTML.includes('Lucro mínimo'));assert.match(s.nodes.finOtherStatsV735.innerHTML,/Lucro mínimo esperado/);assert.match(s.nodes.finSaleChecksV735.innerHTML,/1\.300,00/);assert.match(s.nodes.finSaleChecksV735.innerHTML,/130,00.*m³/);assert.match(s.nodes.finSaleChecksV735.innerHTML,/10\.000,00/);assert.match(s.nodes.finSaleChecksV735.innerHTML,/Total informado manualmente/);assert.match(s.nodes.finEntriesV722.innerHTML,/Custo TOTAL da madeira desta venda/);assert.match(s.nodes.finStatsV722.innerHTML,/fin-review-v735/);assert.match(s.nodes.finPendingV722.textContent,/manual.*diferente/);assert.equal(vm.runInContext('financeRowsV722[0].costCents',s.c),130000);assert.equal(JSON.stringify(row),before);assert.equal(s.calls.length,1);
});

test('manual price per m3 previews and posts the full load cost, and retries preserve unit input',async()=>{
 const s=setup(),row=automaticSale({source:{...automaticSale().source,physicalM3:12.9763,costMode:'manual'}});
 s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true}));await s.c.financeLoadV722();
 const root=saleRoot(row),previous=root.querySelector,mode={value:'m3'},preview={textContent:''},label={textContent:''};
 root.fields.cost.value='1300,00';root.querySelector=selector=>({'[data-load-sale-cost-mode]':mode,'[data-load-sale-cost-preview]':preview,'[data-load-sale-cost-label]':label}[selector]||previous(selector));
 s.c.financeLoadCostPreviewV736(root);assert.match(preview.textContent,/16.869,19/);assert.match(label.textContent,/por m³/);
 let fail=true;s.setRequest(async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.costCents,1686919);assert(!Object.hasOwn(body,'amountCents'));if(fail){fail=false;throw Error('Sem resposta');}return response({empresaId:'tenant',entry:{...row,costCents:body.costCents,revision:1}});});
 await s.c.financeSaveLoadSaleV724(root);assert.equal(root.fields.cost.value,'1300,00');assert.equal(mode.value,'m3');assert.match(root.fields.status.textContent,/preservados/);
 await s.c.financeSaveLoadSaleV724(root);assert.match(s.nodes.finSaleChecksV735.innerHTML,/16.869,19/);
 mode.value='total';s.c.financeLoadCostPreviewV736(root);assert.match(preview.textContent,/1.300,00/);
});

test('pending automatic cost explains missing purchase and is not displayed as zero',async()=>{
 const s=setup(),reason='Falta o movimento de entrada de uma compra registrada.',row=automaticSale({source:{...automaticSale().source,costMode:'pending',automaticCostCents:null,automaticCostPendingReason:reason,costPendingReason:reason,physicalM3:10}});
 s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true}));await s.c.financeLoadV722();
 assert.match(s.nodes.finEntriesV722.innerHTML,/data-load-sale-auto checked/);assert.match(s.nodes.finEntriesV722.innerHTML,/Automático — aguardando custo da compra/);assert.match(s.nodes.finSaleChecksV735.innerHTML,/Falta o movimento de entrada/);assert.match(s.nodes.finSaleChecksV735.innerHTML,/Pendente/);
 const root=saleRoot(row),previous=root.querySelector,auto={checked:true},preview={textContent:''};root.querySelector=selector=>selector==='[data-load-sale-auto]'?auto:selector==='[data-load-sale-cost-preview]'?preview:previous(selector);
 s.c.financeLoadCostPreviewV736(root);assert.match(preview.textContent,/aguardando custo da compra/);assert(!preview.textContent.includes('R$ 0,00'));
 s.setRequest(async(url,options)=>{assert.equal(JSON.parse(options.body).costCents,null);return response({empresaId:'tenant',entry:row});});await s.c.financeSaveLoadSaleV724(root);assert.equal(root.fields.cost.disabled,true);
});
test('manual correction remains manual but exposes why purchase cost cannot be calculated',async()=>{
 const s=setup(),row=automaticSale({costCents:130000,source:{...automaticSale().source,costMode:'manual',automaticCostCents:null,automaticCostPendingReason:'Há entrada sem preço posterior ao salvamento do custo antigo.'}});
 s.setRequest(async()=>response({empresaId:'tenant',entries:[row],canWrite:true}));await s.c.financeLoadV722();assert(!s.nodes.finEntriesV722.innerHTML.includes('data-load-sale-auto checked'));assert.match(s.nodes.finSaleChecksV735.innerHTML,/entrada sem preço/);assert.match(s.nodes.finSaleChecksV735.innerHTML,/total manual foi mantido/);assert.equal(vm.runInContext('financeRowsV722[0].costCents',s.c),130000);
});
