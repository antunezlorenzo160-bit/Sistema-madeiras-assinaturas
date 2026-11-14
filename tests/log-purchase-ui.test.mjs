import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {volumeToras,chaveEspecieToras} from '../public/toras.mjs';import {normalizeLogPurchaseV756,groupLogPurchaseLinesV756} from '../public/log-purchase.mjs';import {financeCents} from '../public/company-finance.mjs';
const source=readFileSync(new URL('../ui/log-purchase.js',import.meta.url),'utf8');
function setup(storage=new Map()){
 const nodes={};for(const [,id]of source.matchAll(/id="([^"]+)"/g))nodes[id]={value:'',checked:false,hidden:false,disabled:false,dataset:{},textContent:'',innerHTML:'',querySelectorAll:()=>[]};
 const root={querySelector:s=>nodes[s.slice(1)]},calls=[],member={papel:'admin'};let send=async()=>{throw Error('Sem resposta');};
 const c={Date,AbortSignal,URLSearchParams,crypto:{randomUUID},financeCents,normalizeLogPurchaseV756,groupLogPurchaseLinesV756,volumeToras,chaveEspecieToras,esc:s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;'),num4:n=>Number(n).toFixed(4),finMoneyV722:n=>'R$'+(n/100).toFixed(2),empresaV456:'tenant',parent:{__smEmployeeMember:()=>member},navigator:{onLine:true},window:{__v456Local:{durable:true,getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},authV456:{currentUser:{getIdToken:async()=> 'token'}},document:{getElementById:()=>null},confirm:()=>true,fixtureRoot:root,fetch:async(url,options)=>{calls.push({url,options});return send(url,options);},financeLoadedRangeV722:{from:'old'},seed:JSON.parse(storage.get('log_purchase_v756:tenant')||'null')};
 vm.createContext(c);vm.runInContext(source+"\nlogPurchaseCompanyV756='tenant';logPurchaseRootV756=fixtureRoot;logPurchaseDraftV756=seed||logFreshV756();",c);c.logFillV756();nodes.lpSupplierV756.value='Fornecedor';nodes.lpSpeciesV756.value='Pinus';nodes.lpDiameterV756.value='30';nodes.lpLengthV756.value='4';nodes.lpQuantityV756.value='10';nodes.lpUnitV756.value='1000';return {c,nodes,calls,storage,member,setSend:fn=>send=fn};
}
const saved=s=>JSON.parse(s.storage.get('log_purchase_v756:tenant'));
test('add/group/edit/remove draft offline without touching finance and keep remove button stable on blur',()=>{
 const s=setup();s.c.navigator.onLine=false;s.c.logAddV756();s.nodes.lpDiameterV756.value='30';s.c.logAddV756();assert.equal(saved(s).lines.length,1);assert.equal(saved(s).lines[0].quantidade,20);assert.equal(s.calls.length,0);
 const host=s.nodes.lpLinesV756;let html=host.innerHTML,replaced=0;Object.defineProperty(host,'innerHTML',{get:()=>html,set:v=>{html=v;replaced++;}});s.nodes.lpSupplierV756.value='Outro fornecedor';s.c.logStoreV756(s.c.logReadV756());s.c.logRenderV756();assert.equal(replaced,0);
 s.c.logRemoveV756({target:{closest:()=>({dataset:{lpRemove:'0'}})}});assert.equal(saved(s).lines.length,0);assert.equal(saved(s).supplier,'Outro fornecedor');assert.equal(s.calls.length,0);
});
test('uncertain request keeps immutable purchase identity after reload and retry; successful result creates no second entry',async()=>{
 const s=setup();s.c.logAddV756();await s.c.logConfirmV756();assert(saved(s).pending);assert(s.nodes.lpNewV756.disabled);const original=JSON.parse(s.calls[0].options.body).purchase;
 s.c.logRemoveV756({target:{closest:()=>({dataset:{lpRemove:'0'}})}});assert.equal(saved(s).lines.length,1);
 const resumed=setup(s.storage);resumed.nodes.lpSupplierV756.value='Do not change signed payload';resumed.setSend(async(url,options)=>{const payload=JSON.parse(options.body).purchase;assert.deepEqual(payload,original);return {ok:true,json:async()=>({receipt:{...normalizeLogPurchaseV756(payload),status:'active',revision:1}})};});await resumed.c.logConfirmV756();assert(saved(resumed).confirmed);assert.equal(saved(resumed).pending,null);assert.match(resumed.nodes.lpStatusV756.textContent,/uma única vez/);assert.equal(resumed.c.financeLoadedRangeV722,null);await resumed.c.logConfirmV756();assert.equal(resumed.calls.length,1);
});
test('offline/non-owner/temporary storage never submits and quota failure preserves original draft',async()=>{
 const s=setup();s.c.logAddV756();s.c.navigator.onLine=false;await s.c.logConfirmV756();assert.equal(s.calls.length,0);assert.equal(saved(s).pending,null);s.c.navigator.onLine=true;s.member.papel='employee';await s.c.logConfirmV756();assert.equal(s.calls.length,0);s.member.papel='admin';s.c.window.__v456Local.durable=false;await s.c.logConfirmV756();assert.equal(s.calls.length,0);
 const before=s.storage.get('log_purchase_v756:tenant');s.c.window.__v456Local.setItem=()=>{throw Error('Sem espaço');};s.c.logRemoveV756({target:{closest:()=>({dataset:{lpRemove:'0'}})}});assert.equal(s.storage.get('log_purchase_v756:tenant'),before);assert.match(s.nodes.lpStatusV756.textContent,/Sem espaço/);
});
test('late confirmation response cannot mutate a different company',async()=>{
 const s=setup();s.c.logAddV756();let done;s.setSend(async()=>new Promise(resolve=>done=resolve));const task=s.c.logConfirmV756();await new Promise(resolve=>setImmediate(resolve));assert(done);const old=s.storage.get('log_purchase_v756:tenant');s.c.empresaV456='other';done({ok:true,json:async()=>({receipt:{...normalizeLogPurchaseV756(saved(s).pending),status:'active'}})});await task;assert.equal(s.storage.get('log_purchase_v756:tenant'),old);assert.equal(s.storage.has('log_purchase_v756:other'),false);
});

test('generated app mounts purchases within Toras and non-owner guard blocks purchase controls',()=>{
 const raw=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),app=JSON.parse(raw.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]);
 assert(app.includes('montarCompras:mountLogPurchaseV756'));assert(app.includes('function normalizeLogPurchaseV756('));assert(app.includes('data-open-log-purchase'));assert(app.includes('criarSincronismoToras, volumeToras, chaveEspecieToras'));
 const toras=readFileSync(new URL('../public/toras.mjs',import.meta.url),'utf8');assert(toras.includes("abrir.addEventListener('click', () => { montarCompras?.({dialog,doc});"),'retry mounting after owner session becomes available');
 const start=app.indexOf('function employeeActionAllowed(target){'),end=app.indexOf("document.addEventListener('click'",start),c={parent:{__smEmployeeMember:()=>({papel:'employee'}),__smEmployeeCan:()=>true},employeeNavigationRoute:()=>null};vm.createContext(c);vm.runInContext(app.slice(start,end),c);const control={id:'lpConfirmV756',dataset:{},closest:selector=>selector.includes('#torasPurchasesV756')?{}:null};assert.equal(c.employeeActionAllowed({closest:()=>control}),false);
});
