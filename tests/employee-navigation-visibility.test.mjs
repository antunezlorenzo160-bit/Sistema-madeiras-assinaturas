import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {employeeCan,normalizePermissions} from '../public/employee-permissions.mjs';
function element(dataset={},display=''){
 const classes=new Set(),properties=new Map();if(display)properties.set('display',{value:display,priority:'important'});
 return {nodeType:1,dataset:{...dataset},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x),toggle(x,force){const add=force===undefined?!classes.has(x):force;if(add)classes.add(x);else classes.delete(x);return add;}},style:{getPropertyValue:key=>properties.get(key)?.value||'',getPropertyPriority:key=>properties.get(key)?.priority||'',setProperty:(key,value,priority='')=>properties.set(key,{value,priority}),removeProperty:key=>properties.delete(key)},closest(){return this.label||null;}};
}
function setup(ready=true){
 const member={ativo:true,papel:'employee',permissionsVersion:2,permissoes:normalizePermissions({clients:{write:true},calculator:{write:true},budgets:{write:true}})},nav=[],sections=[],inputs=[],events={},observers=[];let updates=0;
 const c={parent:{__smEmployeeMember:()=>member,__smEmployeeCan:(area,write)=>employeeCan(member,area,write)},document:{documentElement:{},head:{append(){}},createElement:()=>element(),querySelectorAll:selector=>selector==='main>section.tab'?sections:selector.startsWith('input[')?inputs:nav,addEventListener:(type,fn)=>events[type]=fn},window:{addEventListener(){}},MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(target,options){this.options=options;}},queueMicrotask,setTimeout(){},Event:class{constructor(type,options){this.type=type;this.bubbles=options.bubbles;}}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8'),c);
 if(ready)vm.runInContext('employeeAppReady=true',c);
 c.employeeUpdateUI=()=>{updates++;c.employeeUpdateNavigationVisibility();c.employeeUpdateDestinationVisibility();};
 return {c,member,nav,sections,inputs,observers,events,updates:()=>updates,flush:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('allowed home/sidebar buttons appear and denied ones use inline important to beat forced menu CSS',()=>{
 const s=setup(),allowed=element({inicioDestino:'clientes'},'flex'),denied=element({lateralDestino:'empresa'},'block');allowed.classList.add('permissao-oculta');s.nav.push(allowed,denied);s.c.employeeUpdateNavigationVisibility();assert(!allowed.classList.contains('employee-denied'));assert(!allowed.classList.contains('permissao-oculta'));assert.equal(allowed.style.getPropertyValue('display'),'flex');assert.equal(denied.style.getPropertyValue('display'),'none');assert.equal(denied.style.getPropertyPriority('display'),'important');assert(denied.classList.contains('employee-denied'));
 s.member.papel='admin';s.c.employeeUpdateNavigationVisibility();assert.equal(denied.style.getPropertyValue('display'),'block');assert(!denied.classList.contains('employee-denied'));
});
test('menu cloned after startup is filtered on insertion, including permission styles inherited from another route',async()=>{
 const s=setup();s.c.employeeUpdateNavigationVisibility();const denied=element({lateralDestino:'configuracoes'});s.nav.push(denied);s.observers[0].callback([{type:'childList',addedNodes:[denied]}]);await s.flush();assert.equal(denied.style.getPropertyValue('display'),'none');
 const clone=element({...denied.dataset,lateralDestino:'clientes'},'none');clone.classList.add('employee-denied');s.nav.push(clone);s.observers[0].callback([{type:'childList',addedNodes:[clone]}]);await s.flush();assert(!clone.classList.contains('employee-denied'));assert.equal(clone.style.getPropertyValue('display'),'');
});
test('unauthorized calculator tabs hide and checked selection moves only after all permissions are applied',()=>{
 const s=setup(),values=['orcamento','estoque1','estoque2','carga','plaina','transferencia'];let changes=0;
 for(const value of values){const input=element();Object.assign(input,{value,checked:value==='carga',label:element(),dispatchEvent(event){changes++;assert.equal(event.type,'change');assert(s.inputs.filter(x=>x.value!=='orcamento').every(x=>x.disabled));}});s.inputs.push(input);}
 s.c.employeeUpdateDestinationVisibility();assert.equal(changes,1);assert.equal(s.inputs[0].checked,true);assert(!s.inputs[0].label.classList.contains('employee-denied'));for(const input of s.inputs.slice(1)){assert(input.disabled);assert.equal(input.label.style.getPropertyValue('display'),'none');}s.c.employeeUpdateDestinationVisibility();assert.equal(changes,1);
});
test('style rewrites cannot expose a denied button and our own visibility updates do not loop',async()=>{
 const s=setup(),button=element({lateralDestino:'estoque'});s.nav.push(button);s.c.employeeUpdateNavigationVisibility();button.style.setProperty('display','block','important');s.observers[0].callback([{type:'attributes',attributeName:'style',target:button}]);await s.flush();assert.equal(s.updates(),1);assert.equal(button.style.getPropertyValue('display'),'none');s.observers[0].callback([{type:'attributes',attributeName:'style',target:button}]);await s.flush();assert.equal(s.updates(),1);
 s.observers[0].callback([{type:'childList',addedNodes:[{nodeType:3}]}]);await s.flush();assert.equal(s.updates(),1);
});

test('orders-only access shows Pedidos and hides Orçamentos even in PC/header buttons',()=>{const s=setup();s.member.permissoes=normalizePermissions({orders:{read:true}});const orders=element({lateralDestino:'pedidos'}),budget=element({pcnav:'orcamento'}),header=element({tab:'orcamento'});s.nav.push(orders,budget,header);s.c.employeeUpdateNavigationVisibility();assert(!orders.classList.contains('employee-denied'));assert.equal(budget.style.getPropertyValue('display'),'none');assert.equal(header.style.getPropertyValue('display'),'none');assert(s.c.employeeTabAllowed('orcamento'));});

test('startup ignores early mutations until app initialization completes, then applies current permissions',async()=>{
 const s=setup(false),denied=element({lateralDestino:'estoque'});s.nav.push(denied);
 s.observers[0].callback([{type:'childList',addedNodes:[denied]}]);await s.flush();assert.equal(s.updates(),0);
 s.c.employeeStartVisibility();await s.flush();assert.equal(s.updates(),1);assert.equal(denied.style.getPropertyValue('display'),'none');
});
test('permission helpers inspect destination without invoking calculator initialization side effects',()=>{
 const s=setup();s.c.document.querySelector=()=>({value:'estoque1'});
 s.c.destinoSelecionado=()=>{throw new ReferenceError("Cannot access 'destinoAtual' before initialization");};
 assert.equal(s.c.employeeSelectedDestination(),'estoque1');assert.equal(s.c.employeeDestinationAllowed(true),false);
});

test('permission UI starts at module completion rather than DOM events that may fire during top-level await',()=>{
 const helper=readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8');
 assert(!helper.includes("addEventListener('DOMContentLoaded'"));assert(!helper.includes("addEventListener('load'"));
 const build=readFileSync(new URL('../scripts/employee-access-build.mjs',import.meta.url),'utf8');assert(build.includes("employeeStartVisibility();\\nparent.__v456Ready("));
});
