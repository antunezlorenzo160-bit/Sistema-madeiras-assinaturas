import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {employeeCan,normalizePermissions} from '../public/employee-permissions.mjs';
function setup(){
 const member={papel:'employee',ativo:true,permissionsVersion:1,permissoes:normalizePermissions({calculator:{write:true},clients:{write:true},budgets:{write:true},stock:{read:true},loads:{write:true}})};
 const context={parent:{__smEmployeeMember:()=>member,__smEmployeeCan:(area,write)=>employeeCan(member,area,write)},document:{addEventListener(){},createElement:()=>({}),head:{append(){}}},window:{addEventListener(){}},setTimeout(){}};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8'),context);
 const control=(dataset={},id='',section='inicio')=>({dataset,id,textContent:'Atalho',getAttribute:()=>'',matches:()=>false,closest:selector=>selector==='section.tab'?{id:section}:null});
 const allowed=button=>context.employeeActionAllowed({closest:()=>button});
 return {context,control,allowed,member};
}
test('home and cloned sidebar shortcuts follow selected permissions rather than blocking everything',()=>{
 const s=setup();
 for(const key of ['inicioDestino','lateralDestino']){
  for(const route of ['calculadora','clientes','orcamento','pedidos','estoque','movimentacoes','carregamentos'])assert.equal(s.allowed(s.control({[key]:route})),true,key+': '+route);
  for(const route of ['empresa','configuracoes'])assert.equal(s.allowed(s.control({[key]:route})),false,key+': '+route);
 }
 assert.equal(s.allowed(s.control({},'sairInicioV492')),true);
 assert.equal(s.allowed(s.control({lateralDestino:'sair'})),true);
});
test('viewing stock does not grant stock changes, and removing a permission still blocks its shortcut',()=>{
 const s=setup();assert.equal(s.allowed(s.control({},'saveStock','estoque')),false);
 s.member.permissoes.stock={read:false,write:false};
 assert.equal(s.allowed(s.control({inicioDestino:'estoque'})),false);
 assert.equal(s.allowed(s.control({lateralDestino:'movimentacoes'})),false);
 assert.equal(s.allowed(s.control({inicioDestino:'clientes'})),true);
});
test('markup routing matches actual application shortcut attributes',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 for(const attribute of ['data-inicio-destino','data-lateral-destino'])assert(html.includes(attribute));
 const source=readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8');assert(source.includes('dataset?.inicioDestino'));assert(source.includes('dataset?.lateralDestino'));
});
