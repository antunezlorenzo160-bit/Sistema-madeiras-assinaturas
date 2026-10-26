import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompanyManagement} from '../public/plataforma/company-management.mjs';

function element(tag){
 return {tagName:tag,children:[],value:'',hidden:false,disabled:false,attrs:{},events:{},textContent:'',
  append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;},setAttribute(name,value){this.attrs[name]=value;},addEventListener(name,callback){this.events[name]=callback;},
  querySelectorAll(){return this.children.flatMap(child=>[child,...(child.querySelectorAll?.()||[])]).filter(child=>['button','input','select','textarea'].includes(child.tagName));}};
}
test('company search, details, confirmed suspension and trial form use protected API actions',async()=>{
 const host=element('div'),search=element('input'),requests=[];let refreshed=0;
 const document={getElementById:id=>id==='companies-list'?host:search,createElement:element,createTextNode:text=>({textContent:text})};
 const company={id:'tenant',empresaId:'tenant',name:'Empresa',createdAt:1,email:'owner@example.com'};
 const api=async input=>{requests.push(input);return input.action==='company.detail'?{company,profile:{cnpj:'123'},subscription:{status:'trial',trialMode:'indefinite'},members:[{uid:'owner',ativo:true}]}:{ok:true};};
 const manager=createCompanyManagement({document,api,onChange:async()=>refreshed++,status(){},confirmAction:()=>true});
 manager.render({companies:[company],subscriptions:[{empresaId:'tenant',status:'trial'}],plans:[]});assert.equal(host.children.length,1);
 const card=host.children[0],button=card.children.find(e=>e.tagName==='button');await button.onclick();
 assert.equal(requests[0].action,'company.detail');
 const panel=card.children.find(e=>e.className==='company-detail'),forms=panel.children.filter(e=>e.tagName==='form');
 await forms[0].onsubmit({preventDefault(){}});assert.equal(requests[1].action,'company.access');assert.equal(requests[1].accessStatus,'suspended');assert.equal(requests[1].expectedUpdatedAt,1);
 await forms[1].onsubmit({preventDefault(){}});assert.equal(requests[2].action,'trial.save');assert.equal(requests[2].mode,'indefinite');assert.equal(refreshed,2);
 search.value='no match';search.events.input();assert.equal(host.children[0].textContent,'Nenhuma empresa encontrada.');
});
