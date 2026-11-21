import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
class Node{
 constructor(tag='div',id='',classes=[]){this.tagName=tag.toUpperCase();this.id=id;this.childNodes=[];this.parentElement=null;this.open=false;this.value='';this.className=classes.join(' ');this.classList={contains:name=>this.className.split(' ').includes(name)};}
 get children(){return this.childNodes.filter(n=>n.tagName!=='#COMMENT');}
 append(node){node.remove();this.childNodes.push(node);node.parentElement=this;}
 insertBefore(node,target){node.remove();this.childNodes.splice(this.childNodes.indexOf(target),0,node);node.parentElement=this;}
 before(node){this.parentElement.insertBefore(node,this);}
 remove(){if(this.parentElement){const p=this.parentElement;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentElement=null;}}
 replaceWith(node){const parent=this.parentElement;node.remove();const i=parent.childNodes.indexOf(this);parent.childNodes.splice(i,1,node);node.parentElement=parent;this.parentElement=null;}
 closest(tag){let node=this;while(node){if(node.tagName===tag.toUpperCase())return node;node=node.parentElement;}return null;}
 setAttribute(){}
}
function setup(wide=true){
 const nodes={},add=(tag,id,parent,classes)=>{const n=new Node(tag,id,classes);if(id)nodes[id]=n;if(parent)parent.append(n);return n;};
 const panel=add('div','financePanelV722'),card=add('div','card',panel),title=add('h3','title',card),note1=add('p','',card,['note']),note2=add('p','',card,['note']),policy=add('details','finMinimumPolicyV726',card),field=add('input','percent',policy);field.value='30';
 const opening=add('details','finOpeningBoxV732',card),amount=add('input','amount',opening);amount.value='1000,00';add('div','period',card);const numbers=add('div','finNumbersV722',card);add('div','stats',numbers);add('div','finSaleChecksV735',numbers);const other=add('details','finOtherTotalsV735',numbers),graph=add('details','graph',numbers);add('div','finChartV722',graph);add('details','table',numbers);
 const original=[...card.childNodes],originalNumbers=[...numbers.childNodes],media={matches:wide,addEventListener:(event,fn)=>media.change=fn};const events={};const c={addEventListener:(name,fn)=>events[name]=fn,matchMedia:()=>media,setTimeout:fn=>fn(),document:{getElementById:id=>nodes[id],createElement:tag=>new Node(tag),createComment:()=>new Node('#comment')}};vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/desktop-dashboard.js',import.meta.url),'utf8'),c);
 return {nodes,card,numbers,graph,other,policy,opening,field,amount,original,originalNumbers,media,events};
}
test('desktop dashboard moves original controls and chart nodes above details, preserving values and identities',()=>{
 const s=setup();assert.equal(s.graph.parentElement.className,'dashboard-charts-v760');assert.equal(s.other.parentElement,s.graph.parentElement);assert.equal(s.graph.open,true);assert.equal(s.other.open,true);assert.equal(s.policy.parentElement.className,'dashboard-settings-v760');assert.equal(s.field.value,'30');assert.equal(s.amount.value,'1000,00');assert.equal(s.numbers.children.indexOf(s.graph.parentElement)<s.numbers.children.indexOf(s.nodes.finSaleChecksV735),true);
 const count=s.card.childNodes.length;s.media.change();assert.equal(s.card.childNodes.length,count);s.field.value='35';s.media.matches=false;s.media.change();assert.deepEqual(s.card.childNodes,s.original);assert.deepEqual(s.numbers.childNodes,s.originalNumbers);assert.equal(s.field.value,'35');assert.equal(s.graph.open,false);assert.equal(s.other.open,false);
});
test('phone layout stays in original order and responsive transitions never duplicate forms',()=>{
 const s=setup(false);assert.deepEqual(s.card.childNodes,s.original);assert.deepEqual(s.numbers.childNodes,s.originalNumbers);s.media.matches=true;s.media.change();s.media.matches=false;s.media.change();assert.deepEqual(s.card.childNodes,s.original);assert.deepEqual(s.numbers.childNodes,s.originalNumbers);assert.equal(s.policy.children.filter(n=>n.id==='percent').length,1);
});

test('printing restores the original report structure and returns to the dashboard afterward',()=>{
 const s=setup();s.events.beforeprint();assert.deepEqual(s.card.childNodes,s.original);assert.deepEqual(s.numbers.childNodes,s.originalNumbers);s.events.afterprint();assert.equal(s.graph.parentElement.className,'dashboard-charts-v760');assert.equal(s.field.value,'30');
});
