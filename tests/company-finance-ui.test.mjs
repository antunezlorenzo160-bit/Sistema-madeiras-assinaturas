import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
function setup(){
 const nodes={},fields=[];for(const [,id] of readFileSync(new URL('../ui/company-finance.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g))nodes[id]={id,value:'',hidden:false,disabled:false,innerHTML:'',textContent:'',handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},querySelectorAll:()=>fields,scrollIntoView(){}};
 const inputs=['finTypeV722','finDateV722','finDescriptionV722','finPartnerV722','finReferenceV722','finCategoryV722','finAmountV722','finCostV722'];fields.push(...inputs.map(id=>nodes[id]),nodes.finSaveV722,nodes.finNewV722);
 nodes.finFormV722.reset=()=>{for(const id of inputs)nodes[id].value='';nodes.finTypeV722.value='purchase';nodes.finCategoryV722.value='wood';};
 nodes.finGroupV722.value='month';let fetchImpl;const calls=[],timers=[],member={papel:'admin'},user={uid:'owner',getIdToken:async()=> 'token'};
 const c={console,Date,AbortSignal,URLSearchParams,crypto:{randomUUID},navigator:{onLine:true},parent:{__smEmployeeMember:()=>member},authV456:{currentUser:user},empresaV456:'tenant',document:{getElementById:id=>nodes[id]||null},esc:s=>String(s).replace(/[<>&"']/g,'_'),stockChartLabelV720:key=>key.split('-').reverse().join('/'),confirm:()=>true,setTimeout:fn=>timers.push(fn),fetch:async(url,options)=>{calls.push({url,options});return fetchImpl(url,options);}};
 vm.createContext(c);const pure=['stock-charts.mjs','company-finance.mjs'].map(p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','')).join('\n');vm.runInContext(pure+'\n'+readFileSync(new URL('../ui/company-finance.js',import.meta.url),'utf8'),c);timers.forEach(fn=>fn());nodes.finFromV722.value='2026-11-01';nodes.finToV722.value='2026-11-30';
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
