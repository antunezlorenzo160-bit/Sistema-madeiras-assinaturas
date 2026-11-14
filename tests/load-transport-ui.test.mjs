import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup(){
 const c={Date,console,document:{},setTimeout(){},finOwnerV722:()=>true,financeLoadedRangeV722:{from:'2026-11-01',to:'2026-11-30'},finMoneyV722:n=>'R$ '+(n/100).toFixed(2).replace('.',','),moeda:n=>'R$ '+n.toFixed(2).replace('.',','),esc:s=>String(s).replace(/[<>&"']/g,'_')};
 vm.createContext(c);const pure=['stock-charts.mjs','company-finance.mjs','load-transport.mjs'].map(p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','')).join('\n');vm.runInContext(pure+'\n'+readFileSync(new URL('../ui/load-transport.js',import.meta.url),'utf8'),c);
 const nodes={mode:{value:'own'},date:{value:'2026-11-07'},status:{textContent:''},total:{textContent:''},body:{innerHTML:''}},costs={carrier:'200,00',fuel:'80,00',tolls:'0',driver:'0',maintenance:'0',other:'0'};
 for(const [k,value] of Object.entries(costs))nodes[k]={value,hasAttribute:()=>false};
 nodes.form={querySelectorAll:()=>[]};const root={dataset:{transportLoad:'load'},querySelector(selector){if(selector==='[data-transport-form]')return nodes.form;if(selector==='[data-transport-mode]')return nodes.mode;if(selector==='[data-transport-date]')return nodes.date;if(selector==='[data-transport-status]')return nodes.status;if(selector==='[data-transport-total]')return nodes.total;if(selector==='[data-transport-body]')return nodes.body;return nodes[selector.match(/data-transport-cost="(\w+)"/)?.[1]];}};
 Object.assign(c.transportStateV723('load'),{loaded:true,canWrite:true,config:{mode:'own',date:'2026-11-07',costs:{},revision:4}});return {c,root,nodes};
}
test('freight is displayed as a charge and hidden mode costs are never submitted as expenses',()=>{
 const {c,root,nodes}=setup();const html=c.loadTransportFormV723('load',0,200);assert.match(html,/R\$ 200,00/);assert.match(html,/compõe a venda, não a despesa/);
 let input=c.transportPayloadV723(root);assert.equal(input.costs.fuel,8000);assert.equal(input.costs.carrier,0);assert.equal(input.revision,4);assert(!Object.hasOwn(input,'freightCharged'));
 nodes.mode.value='contracted';input=c.transportPayloadV723(root);assert.equal(input.costs.carrier,20000);assert.equal(input.costs.fuel,0);
 nodes.mode.value='customer';input=c.transportPayloadV723(root);assert(Object.values(input.costs).every(n=>n===0));
});
test('save failure preserves values and success invalidates the financial view for refresh',async()=>{
 const {c,root,nodes}=setup();c.financeRequestV722=async()=>{throw Error('Sem conexão');};await c.transportSaveV723(root);assert.equal(nodes.fuel.value,'80,00');assert.match(nodes.status.textContent,/preservados/);
 let captured;c.financeRequestV722=async(input,range,endpoint)=>{captured=input;assert.equal(endpoint,'company-transport');return {config:{...input,totalCents:8000,revision:5}};};await c.transportSaveV723(root);assert.equal(captured.costs.fuel,8000);assert.equal(captured.costs.carrier,0);assert.equal(c.financeLoadedRangeV722,null);assert.match(nodes.status.textContent,/80,00.*Financeiro/);assert.equal(c.transportStateV723('load').config.revision,5);
});
test('employee does not get the private transport form',()=>{const {c}=setup();c.finOwnerV722=()=>false;assert.equal(c.loadTransportFormV723('load',0,200),'');});
