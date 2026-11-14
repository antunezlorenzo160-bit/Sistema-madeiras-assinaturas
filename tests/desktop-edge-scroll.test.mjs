import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),app=JSON.parse(raw.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]),start=app.indexOf('// Mouse edge scrolling for the active desktop page.'),end=app.indexOf('const logoCentroPcV516=',start),source=app.slice(start,end);
function setup({kind='input',calculator=false,dialog=false}={}){
 const main={scrollTop:200,scrollHeight:2000,clientHeight:600,overflowY:'auto',parentElement:null},field={value:'70',scrollTop:0,scrollHeight:1000,clientHeight:50,overflowY:'auto',parentElement:main,closest(selector){if(selector.includes('input')&&['input','textarea','select','editable'].includes(kind))return this;if(selector.includes('[role="dialog"]')&&dialog)return {};if(selector.includes('#calcFerramentasV492')&&calculator)return {};return null;},focus(){throw Error('Do not change input focus');}};
 const frames=new Map(),listeners={},windowListeners={};let seq=0;const mouse={matches:true};
 const c={console,document:{hidden:false,body:{},documentElement:{addEventListener:(name,fn)=>listeners[name]=fn},scrollingElement:main,elementFromPoint:()=>field,getElementById:id=>id==='inicio'?{classList:{contains:()=>false}}:null,querySelector:selector=>selector==='header'?{getBoundingClientRect:()=>({bottom:100})}:selector==='main'?main:null,addEventListener:(name,fn)=>listeners[name]=fn},window:{innerHeight:800,addEventListener:(name,fn)=>windowListeners[name]=fn},matchMedia:()=>mouse,getComputedStyle:el=>({overflowY:el.overflowY||'visible'}),requestAnimationFrame:fn=>{const id=++seq;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)};
 vm.createContext(c);vm.runInContext(source,c);return {c,main,field,frames,mouse,listeners,windowListeners,move:(y,extra={})=>listeners.pointermove({pointerType:'mouse',buttons:0,clientX:300,clientY:y,...extra}),tick(){const [id,fn]=frames.entries().next().value||[];if(fn){frames.delete(id);fn(100);}}};
}
test('desktop page keeps scrolling over editable fields, including calculator fields, without scrolling inside them',()=>{
 for(const kind of ['input','textarea','select','editable'])for(const calculator of [false,true]){
  const s=setup({kind,calculator});s.move(790);s.tick();assert(s.main.scrollTop>200,kind+' should not stop page scroll');assert.equal(s.field.scrollTop,0);assert.equal(s.field.value,'70');
 }
});
test('top edge goes up, center does not scroll, and non-editable calculator controls/dialogs retain their prior behavior',()=>{
 const top=setup();top.move(110);top.tick();assert(top.main.scrollTop<200);const center=setup();center.move(400);center.tick();assert.equal(center.main.scrollTop,200);
 for(const options of [{kind:'button',calculator:true},{kind:'input',dialog:true}]){const s=setup(options);s.move(790);s.tick();assert.equal(s.main.scrollTop,200);}
});
test('clicking to edit, dragging text, losing the window, and touch mode stop automatic desktop scrolling',()=>{
 for(const stop of ['pointerdown','pointerleave']){const s=setup();s.move(790);s.listeners[stop]();assert.equal(s.frames.size,0);assert.equal(s.main.scrollTop,200);}
 const blur=setup();blur.move(790);blur.windowListeners.blur();assert.equal(blur.frames.size,0);const drag=setup();drag.move(790,{buttons:1});assert.equal(drag.frames.size,0);const touch=setup();touch.move(790,{pointerType:'touch'});assert.equal(touch.frames.size,0);const mobile=setup();mobile.mouse.matches=false;mobile.move(790);assert.equal(mobile.frames.size,0);
});
