import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../ui/history-paint.js',import.meta.url),'utf8'),marker='history-paint-v802';
function setup({supported=true,mobile=true}={}){
 let clock=1000,serial=0;const timers=new Map(),events=new Map(),observers=[],reads=[];
 const classes=(items=[])=>{const values=new Set(items);return {contains:k=>values.has(k),add:k=>values.add(k),remove:k=>values.delete(k)};};
 const block=(height,id)=>({id,rows:['row-'+id],classList:classes(),style:{values:new Map(),setProperty(k,v){this.values.set(k,v);},removeProperty(k){this.values.delete(k);}},getBoundingClientRect(){reads.push(id);assert(blocks.every(b=>!b.style.values.size),'all layout reads precede writes');return {height};}});
 let blocks=[block(240,'a'),block(460,'b')];const host={querySelectorAll:()=>blocks,contains:target=>blocks.includes(target),addEventListener:(n,f)=>events.set('host:'+n,f),removeEventListener:n=>events.delete('host:'+n)};
 const doc={body:{classList:classes(['historico-topo-v507'])},documentElement:{},getElementById:id=>id==='historicoPlanilhasEstoque'?host:null,addEventListener:(n,f,opts)=>{events.set('doc:'+n,f);if(n==='scroll')assert(opts.passive);},removeEventListener:n=>events.delete('doc:'+n)};
 const view={innerWidth:mobile?390:1200,CSS:{supports:()=>supported},matchMedia:()=>({matches:mobile}),setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),getComputedStyle:()=>({paddingTop:'6px',paddingBottom:'6px',borderTopWidth:'1px',borderBottomWidth:'1px'}),MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},addEventListener:(n,f)=>events.set('view:'+n,f),removeEventListener:n=>events.delete('view:'+n)};
 const c={Date:{now:()=>clock},doc,view};vm.createContext(c);vm.runInContext(source,c);const controller=c.startHistoryPaintV802(doc,view);
 return {controller,doc,view,events,reads,observers,get blocks(){return blocks;},set blocks(value){blocks=value;},timers,tick(ms=200){clock+=ms;for(const [id,fn]of [...timers]){timers.delete(id);fn();}}};
}
test('idle optimization keeps every row and measures all real heights before enabling offscreen rendering',()=>{
 const s=setup(),before=s.blocks.map(b=>b.rows.slice());assert.equal(s.reads.length,0);s.tick();assert.deepEqual(s.reads,['a','b']);assert(s.blocks.every(b=>b.classList.contains(marker)));assert.equal(s.blocks[0].style.values.get('--history-content-height-v802'),'226px');assert.equal(s.blocks[1].style.values.get('--history-content-height-v802'),'446px');assert.deepEqual(s.blocks.map(b=>b.rows),before);
 const count=s.reads.length;for(let n=0;n<20;n++)s.events.get('doc:scroll')({target:s.doc});assert.equal(s.reads.length,count);assert.equal(s.timers.size,0);
});
test('scrolling defers measurement until a quiet interval; unsupported and desktop browsers keep ordinary rendering',()=>{
 const s=setup();s.events.get('doc:scroll')({target:s.doc});s.tick(10);assert.equal(s.reads.length,0);s.tick(200);assert.equal(s.reads.length,2);
 const fallback=setup({supported:false});assert.equal(fallback.controller,null);assert.equal(fallback.observers.length,0);assert.equal(fallback.reads.length,0);
 const desktop=setup({mobile:false});desktop.tick();assert.equal(desktop.reads.length,0);assert(desktop.blocks.every(b=>!b.classList.contains(marker)));
});
test('copy/PDF preparation and native printing remove skipped rendering before export, retaining every row',()=>{
 const s=setup();s.tick();s.events.get('host:click')({target:{closest:()=>({})}});assert(s.blocks.every(b=>!b.classList.contains(marker)));assert(s.blocks.every(b=>!b.style.values.size));assert.deepEqual(s.blocks.flatMap(b=>b.rows),['row-a','row-b']);
 s.tick();assert(s.blocks.every(b=>b.classList.contains(marker)));s.events.get('view:beforeprint')();s.tick();assert(s.blocks.every(b=>!b.classList.contains(marker)));s.events.get('view:afterprint')();s.tick();assert(s.blocks.every(b=>b.classList.contains(marker)));
});
test('width changes discard old measurements; viewport height changes do not reset scroll sizing',()=>{
 const s=setup();s.tick();s.events.get('view:resize')();assert(s.blocks.every(b=>b.classList.contains(marker)));s.view.innerWidth=420;s.events.get('view:resize')();assert(s.blocks.every(b=>!b.classList.contains(marker)));s.tick();assert.equal(s.reads.length,4);s.controller.destroy();assert(s.blocks.every(b=>!b.classList.contains(marker)));assert(s.observers.every(o=>o.disconnected));
});
