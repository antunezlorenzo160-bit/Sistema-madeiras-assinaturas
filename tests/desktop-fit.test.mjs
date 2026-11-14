import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup({desktop=true,height=1200,width=900}={}){
 const frames=[],events={},docEvents={};let btn,observer;const media={matches:desktop,addEventListener:(n,fn)=>events.media=fn};
 const classes=new Set();const body={classList:{toggle:(n,on)=>on?classes.add(n):classes.delete(n),remove:n=>classes.delete(n)},append:n=>btn=n};
 const tab={style:{zoom:'',width:'',height:''},scrollHeight:height,scrollWidth:width,getBoundingClientRect(){return {height:height*Number(this.style.zoom||1),width:width*Number(this.style.zoom||1)};}};
 const main={clientWidth:1000,scrollTop:0,querySelector:()=>tab,getBoundingClientRect:()=>({top:100})};
 const context={matchMedia:()=>media,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},MutationObserver:class{constructor(fn){observer=fn;}observe(){}},window:{innerHeight:800,addEventListener:(n,fn)=>events[n]=fn},document:{readyState:'complete',body,querySelector:s=>s==='main'?main:s==='header'?{getBoundingClientRect:()=>({bottom:100})}:null,getElementById:()=>null,createElement:()=>({hidden:false,setAttribute(){},addEventListener(n,fn){this[n]=fn;}}),addEventListener:(n,fn)=>docEvents[n]=fn}};
 vm.createContext(context);vm.runInContext(readFileSync(new URL('../ui/desktop-fit.js',import.meta.url),'utf8'),context);
 const tick=()=>{let limit=10;while(frames.length&&limit--)frames.shift()();assert(limit>0,'no render loop');};tick();return {tab,main,btn,media,events,classes,context,tick,mutate:()=>observer()};
}
test('fits tall and wide desktop content to available viewport, without changing business data',()=>{
 for(const shape of [{height:1200,width:900},{height:600,width:2200},{height:40000,width:1200}]){
  const s=setup(shape),box=s.tab.getBoundingClientRect();assert(box.height<=654.1);assert(box.width<=976.1);assert(s.classes.has('desktop-fit-v748'));assert.match(s.btn.textContent,/Tamanho normal/);
 }
});
test('normal size, mobile resize and print restore original styles; return reapplies fit',()=>{
 const s=setup();s.btn.click();s.tick();assert.equal(s.tab.style.zoom,'');assert.equal(s.btn.textContent,'Ajustar à tela');
 s.btn.click();s.tick();assert(Number(s.tab.style.zoom)<1);
 s.media.matches=false;s.events.media();s.tick();assert.equal(s.tab.style.zoom,'');assert.equal(s.btn.hidden,true);
 s.media.matches=true;s.events.media();s.tick();s.events.beforeprint();assert.equal(s.tab.style.zoom,'');assert(!s.classes.has('desktop-fit-v748'));
 s.events.afterprint();s.tick();assert(Number(s.tab.style.zoom)<1);
});
test('new rows and opening panels recompute fit; initially mobile applies no zoom',()=>{
 const s=setup();const initial=Number(s.tab.style.zoom);s.tab.scrollHeight=3000;s.tab.getBoundingClientRect=function(){return {height:3000*Number(this.style.zoom||1),width:900*Number(this.style.zoom||1)}};s.mutate();s.tick();assert(Number(s.tab.style.zoom)<initial);
 const mobile=setup({desktop:false});assert.equal(mobile.tab.style.zoom,'');assert.equal(mobile.btn.hidden,true);
});
