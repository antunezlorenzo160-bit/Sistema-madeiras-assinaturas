import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../ui/reports.js',import.meta.url),'utf8');
function setup(){
 let active=false;const media={matches:true,addEventListener:(name,fn)=>media.changed=fn},header={children:[],appendChild(node){node.parentNode?.children.splice(node.parentNode.children.indexOf(node),1);this.children.push(node);node.parentNode=this;}},anchor={},home={children:[],insertBefore(node,next){node.parentNode?.children.splice(node.parentNode.children.indexOf(node),1);const index=next?this.children.indexOf(next):-1;if(index>=0)this.children.splice(index,0,node);else this.children.push(node);node.parentNode=this;}};anchor.parentNode=home;
 const bar={parentNode:home,nextSibling:anchor,classList:{toggle(name,value){bar.docked=value;}}};home.children=[bar,anchor];const section={classList:{contains:()=>active}};
 const c={document:{getElementById:id=>id==='reportsViewBarV812'?bar:null,querySelector:selector=>selector==='header .tabs'?{closest:()=>header}:null},window:{matchMedia:()=>media},setTimeout(){}};vm.createContext(c);vm.runInContext(source,c);const update=c.mountReportsDockV812(section);return {bar,home,header,media,update,setActive:value=>{active=value;}};
}
test('report buttons find the header while it is inside the initial screen and dock when reports open',()=>{
 const s=setup();assert.equal(s.bar.parentNode,s.home);s.setActive(true);s.update();assert.equal(s.bar.parentNode,s.header);assert.equal(s.bar.docked,true);s.update();assert.equal(s.header.children.length,1);
 s.setActive(false);s.update();assert.equal(s.bar.parentNode,s.home);assert.equal(s.bar.docked,false);s.setActive(true);s.update();assert.equal(s.bar.parentNode,s.header);assert.equal(s.header.children.length,1);
});
test('desktop resize returns the same controls to their original place without duplicate buttons',()=>{
 const s=setup();s.setActive(true);s.update();s.media.matches=false;s.media.changed();assert.equal(s.bar.parentNode,s.home);assert.equal(s.header.children.length,0);s.media.matches=true;s.media.changed();assert.equal(s.bar.parentNode,s.header);assert.equal(s.home.children.length,1);
});
