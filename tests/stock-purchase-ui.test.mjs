import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {normalizeStockPurchase,groupStockPurchaseLinesV754} from '../public/stock-purchase.mjs';import {financeCents} from '../public/company-finance.mjs';
function setup(storage=new Map()){
 const nodes={},inputs=[];for(const [,id] of readFileSync(new URL('../ui/stock-purchase.html',import.meta.url),'utf8').matchAll(/id="([^"]+)"/g))nodes[id]={id,dataset:{},value:'',checked:false,hidden:false,disabled:false,textContent:'',innerHTML:'',handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},querySelectorAll:()=>inputs};
 const inputIds=['purchaseEnabledV728','purchaseSupplierV728','purchaseDateV728','purchaseReferenceV728','purchaseUnitV728','purchaseFreightV728','purchaseOtherV728','purchaseFreightIncludedV728','purchaseOtherIncludedV728'];inputs.push(...inputIds.map(id=>nodes[id]));
 const calls=[],timers=[],member={papel:'admin'};let send=async()=>{throw Error('Sem resposta');};
 const c={console,Date,AbortSignal,normalizeStockPurchase,groupStockPurchaseLinesV754,financeCents,finMoneyV722:cents=>(cents/100).toFixed(2),num4:n=>Number(n).toFixed(4),esc:String,crypto:{randomUUID},empresaV456:'tenant',parent:{__smEmployeeMember:()=>member},navigator:{onLine:true},authV456:{currentUser:{getIdToken:async()=> 'token'}},window:{__v456Local:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},document:{getElementById:id=>nodes[id],addEventListener(){}},destinoSelecionado:()=> 'estoque1',modoMedida:'m3',$:()=>({checked:false}),prepararProximoLancamentoM3(){},calcPreview(){},setTimeout:fn=>timers.push(fn),confirm:()=>true,fetch:async(url,options)=>{calls.push({url,options});return send(url,options);},sincronizarOfflineOps:async()=>{},waitForPendingWrites:async()=>{},temOperacoesPendentesV428:()=>false,COL:{estoque1:'stock1',estoque2:'stock2',movimentos:'moves'},db:{},doc:()=>{},getDocFromServer:async()=>({exists:()=>false}),estoque1Lancamentos:[],estoque2Lancamentos:[],lancamentos:[],movimentos:[],save(){},renderEstoque(){},renderLancamentos(){},renderPlanilhasM3Especies(){}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/stock-purchase.js',import.meta.url),'utf8'),c);timers.forEach(fn=>fn());nodes.purchaseEnabledV728.checked=true;nodes.purchaseSupplierV728.value='Fornecedor';nodes.purchaseUnitV728.value='1000,00';
 return {c,nodes,calls,member,storage,setSend:fn=>send=fn};
}
const item=()=>({id:randomUUID(),madeiraId:'wood',madeira:'Garapeira',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1,preco:3000,valor:3000});
const response=receipt=>({ok:true,json:async()=>({receipt})});
test('adding purchase items keeps stock untouched, saves a draft and uses purchase rather than selling price',()=>{
 const s=setup();assert.equal(s.c.stockPurchaseCaptureV728(item(),'estoque1'),true);assert.equal(s.c.estoque1Lancamentos.length,0);assert.equal(s.calls.length,0);const d=JSON.parse(s.storage.get('stock_purchase_v728:tenant'));assert.equal(d.lines[0].unitCents,100000);assert.equal(d.lines[0].preco,undefined);assert.equal(d.lines.length,1);assert.match(s.nodes.purchaseStatusV728.textContent,/ainda não foi alterado/);
 s.nodes.purchaseUnitV728.value='1200,00';s.c.stockPurchaseCaptureV728(item(),'estoque1');assert.equal(JSON.parse(s.storage.get('stock_purchase_v728:tenant')).lines[1].unitCents,120000);
});
test('uncertain response retains immutable request, blocks fresh id and retries exactly the same purchase after reload',async()=>{
 const s=setup();s.c.stockPurchaseCaptureV728(item(),'estoque1');await s.c.purchaseConfirmV728();assert.equal(s.calls.length,1);const original=JSON.parse(s.calls[0].options.body),saved=JSON.parse(s.storage.get('stock_purchase_v728:tenant'));assert(saved.pending);assert(s.nodes.purchaseNewV728.disabled);assert.equal(s.c.estoque1Lancamentos.length,0);
 const resumed=setup(s.storage);resumed.nodes.purchaseUnitV728.value='99999';resumed.setSend(async(url,options)=>{assert.match(url,/company-stock-purchase$/);assert.deepEqual(JSON.parse(options.body),original);return response({totalCents:100000,stock:'estoque1',lines:[]});});await resumed.c.purchaseConfirmV728();const confirmed=JSON.parse(s.storage.get('stock_purchase_v728:tenant'));assert(confirmed.confirmed);assert.equal(confirmed.pending,null);assert.match(resumed.nodes.purchaseStatusV728.textContent,/confirmado/);await resumed.c.purchaseConfirmV728();assert.equal(resumed.calls.length,1);
});
test('offline confirmation preserves draft; employee cannot capture or confirm financial purchase',async()=>{
 const s=setup();s.c.stockPurchaseCaptureV728(item(),'estoque1');s.c.navigator.onLine=false;await s.c.purchaseConfirmV728();assert.equal(s.calls.length,0);assert.equal(JSON.parse(s.storage.get('stock_purchase_v728:tenant')).pending,null);assert.match(s.nodes.purchaseStatusV728.textContent,/internet/);
 s.c.navigator.onLine=true;s.member.papel='employee';assert.equal(s.c.stockPurchaseCaptureV728(item(),'estoque1'),false);await s.c.purchaseConfirmV728();assert.equal(s.calls.length,0);
});
test('invalid price or changed stock cannot silently enter the old stock flow; unsupported unit keeps old flow',()=>{
 const s=setup();s.nodes.purchaseUnitV728.value='';assert(s.c.stockPurchaseCaptureV728(item(),'estoque1'));assert.equal(s.c.estoque1Lancamentos.length,0);assert(!s.storage.has('stock_purchase_v728:tenant'));
 s.nodes.purchaseUnitV728.value='1000';s.c.stockPurchaseCaptureV728(item(),'estoque1');assert(s.c.stockPurchaseCaptureV728(item(),'estoque2'));assert.equal(JSON.parse(s.storage.get('stock_purchase_v728:tenant')).lines.length,1);assert.match(s.nodes.purchaseStatusV728.textContent,/estoque escolhido/);assert.equal(s.c.stockPurchaseCaptureV728({...item(),tipoMedida:'m2'},'estoque1'),false);
});
test('a browser using temporary memory cannot submit a purchase that may lose its retry identity',async()=>{
 const s=setup();s.c.stockPurchaseCaptureV728(item(),'estoque1');s.c.window.__v456Local.durable=false;await s.c.purchaseConfirmV728();assert.equal(s.calls.length,0);assert.match(s.nodes.purchaseStatusV728.textContent,/não está preservando/);
});

test('editing purchase fields preserves remove-button DOM until the click removes only the selected draft line',()=>{
 const s=setup();s.c.stockPurchaseCaptureV728(item(),'estoque1');s.nodes.purchaseUnitV728.value='1200';s.c.stockPurchaseCaptureV728(item(),'estoque1');
 const lines=s.nodes.purchaseLinesV728;let html=lines.innerHTML,replacements=0;
 Object.defineProperty(lines,'innerHTML',{get:()=>html,set:value=>{html=value;replacements++;}});
 s.nodes.purchaseSupplierV728.value='Fornecedor corrigido';s.c.purchaseInputV728();
 assert.equal(replacements,0,'blur/change must not replace the button before its click');
 s.nodes.purchaseLinesV728.handlers.click({target:{closest:()=>({dataset:{purchaseRemove:'0'}})}});
 const draft=JSON.parse(s.storage.get('stock_purchase_v728:tenant'));assert.equal(draft.lines.length,1);assert.equal(draft.supplier,'Fornecedor corrigido');assert.equal(s.calls.length,0);assert.equal(s.c.estoque1Lancamentos.length,0);assert.equal(replacements,1);
});

test('remove stays blocked for uncertain or confirmed purchases and storage failure preserves draft',async()=>{
 const s=setup();s.c.stockPurchaseCaptureV728(item(),'estoque1');const click=()=>s.nodes.purchaseLinesV728.handlers.click({target:{closest:()=>({dataset:{purchaseRemove:'0'}})}});
 await s.c.purchaseConfirmV728();assert(JSON.parse(s.storage.get('stock_purchase_v728:tenant')).pending);click();assert.equal(JSON.parse(s.storage.get('stock_purchase_v728:tenant')).lines.length,1);
 const fresh=setup();fresh.c.stockPurchaseCaptureV728(item(),'estoque1');fresh.c.window.__v456Local.setItem=()=>{throw Error('Sem espaço');};fresh.nodes.purchaseLinesV728.handlers.click({target:{closest:()=>({dataset:{purchaseRemove:'0'}})}});assert.equal(JSON.parse(fresh.storage.get('stock_purchase_v728:tenant')).lines.length,1);assert.match(fresh.nodes.purchaseStatusV728.textContent,/Sem espaço/);
 const confirmed=setup();confirmed.c.stockPurchaseCaptureV728(item(),'estoque1');confirmed.setSend(async()=>response({totalCents:100000,stock:'estoque1',lines:[]}));await confirmed.c.purchaseConfirmV728();confirmed.nodes.purchaseLinesV728.handlers.click({target:{closest:()=>({dataset:{purchaseRemove:'0'}})}});assert.equal(JSON.parse(confirmed.storage.get('stock_purchase_v728:tenant')).lines.length,1);
});

test('201 launches of the same measure occupy one draft line; reload and confirmation preserve totals',async()=>{
 const s=setup();for(let i=0;i<201;i++)s.c.stockPurchaseCaptureV728(item(),'estoque1');
 const d=JSON.parse(s.storage.get('stock_purchase_v728:tenant'));assert.equal(d.lines.length,1);assert.equal(d.lines[0].quantidade,201);assert.equal(d.lines[0].volume,201);assert.equal(s.c.estoque1Lancamentos.length,0);assert.match(s.nodes.purchaseStatusV728.textContent,/agrupada/);
 const resumed=setup(s.storage);await resumed.c.purchaseConfirmV728();const payload=JSON.parse(resumed.calls[0].options.body);assert.equal(payload.lines.length,1);assert.equal(payload.lines[0].quantidade,201);assert.equal(payload.lines[0].volume,201);
});
test('existing unconfirmed draft groups on opening, while pending and confirmed requests remain immutable',()=>{
 const s=setup();s.c.stockPurchaseCaptureV728(item(),'estoque1');const key='stock_purchase_v728:tenant',draft=JSON.parse(s.storage.get(key));draft.lines.push({...draft.lines[0],id:randomUUID()});
 s.storage.set(key,JSON.stringify(draft));setup(s.storage);assert.equal(JSON.parse(s.storage.get(key)).lines.length,1);assert.equal(JSON.parse(s.storage.get(key)).lines[0].quantidade,2);
 for(const locked of [{pending:{original:'immutable'}},{confirmed:true}]){
  const original={...draft,...locked},raw=JSON.stringify(original);s.storage.set(key,raw);setup(s.storage);assert.equal(s.storage.get(key),raw);
 }
});
