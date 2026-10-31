import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {productionProjection} from '../Netlify/Funtions/lib/production-access.mjs';
function setup(write=true){
 const requests=[],alerts=[];let version=2,material='';const project=()=>productionProjection({status:'confirmado',atualizadoEm:version,itens:[{id:'line-1',madeira:'Pinheiro',quantidade:12,espessura:2.5,largura:30,comprimento:5,preco:190}],materiaisUsadosProducao:{'line-1':material}},'order');
 const c={parent:{__smEmployeeCan:()=>write,__smEmployeeMember:()=>({papel:'employee'}),__v470Runtime:()=>({auth:{currentUser:{uid:'worker',getIdToken:async()=> 'token'}}})},boundV456:{uid:'worker'},setTimeout,clearTimeout,AbortController,alert:x=>alerts.push(x),fetch:async(url,options)=>{const input=JSON.parse(options.body);requests.push(input);assert.equal(input.revision,version);version++;if(input.action==='material')material=input.text;return {ok:true,json:async()=>({order:project()})};}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/employee-production.js',import.meta.url),'utf8'),c);c.initial=project();vm.runInContext('employeeProductionOrders=[employeeProductionOrder(initial)];employeeProductionWritable=true;',c);return {c,requests,alerts};
}
test('same legacy material field is saved using its original key and concurrent edits use successive revisions',async()=>{
 const {c,requests,alerts}=setup();await Promise.all([c.employeeProductionMaterial({dataset:{prodPedido:'order',prodChave:'line-1'},value:'[ 12 × 3 × 30 × 5 ]'}),c.employeeProductionChange('order','observation',{text:'Conferir medidas'})]);assert.deepEqual(requests.map(x=>x.revision),[2,3]);assert.equal(requests[0].index,0);assert.equal(requests[0].text,'[ 12 × 3 × 30 × 5 ]');assert.equal(alerts.length,0);assert.equal(vm.runInContext("employeeProductionOrders[0].materiaisUsadosProducao['line-1']",c),'[ 12 × 3 × 30 × 5 ]');
});
test('production consultation cannot save material',async()=>{const {c,requests,alerts}=setup(false);await c.employeeProductionMaterial({dataset:{prodPedido:'order',prodChave:'line-1'},value:'[ 1 × 3 × 30 × 5 ]'});assert.equal(requests.length,0);assert(alerts[0].includes('somente à consulta'));});
test('projection shares legacy stable material keys without exposing prices',()=>{const result=productionProjection({itens:[{madeira:'Pinheiro',quantidade:2,espessura:3,largura:20,comprimento:4,preco:100}],materiaisUsadosProducao:{'Pinheiro|3|20|4|2|0':'[ 2 × 3 × 20 × 4 ]'},total:999},'o');assert.equal(result.itens[0].key,'Pinheiro|3|20|4|2|0');assert.equal(result.itens[0].material,'[ 2 × 3 × 20 × 4 ]');assert(!JSON.stringify(result).includes('preco'));assert(!JSON.stringify(result).includes('999'));});
