import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup({mobile=true}={}){
 const docEvents=new Map(),viewEvents=new Map(),windowEvents=new Map(),mutations=[],frames=[],timers=[],styles=new Map(),bodyClasses=new Set(),media={matches:mobile,addEventListener(){}};
 let calcActive=true;
 const main={scrollTop:0,getBoundingClientRect(){const top=Number((styles.get('--calc-visible-top-v733')||'0').replace('px',''));return {top:top+120,bottom:top+Number((styles.get('--calc-visible-height-v733')||'800').replace('px',''))};}};
 const calc={classList:{contains:()=>calcActive},contains:n=>n?.inCalc===true};
 const document={hidden:false,activeElement:null,body:{classList:{contains:c=>bodyClasses.has(c),toggle(c,on){on?bodyClasses.add(c):bodyClasses.delete(c);}},style:{setProperty:(k,v)=>styles.set(k,v),removeProperty:k=>styles.delete(k)}},getElementById:id=>id==='calculadora'?calc:null,querySelector:()=>main,addEventListener:(name,fn)=>{if(!docEvents.has(name))docEvents.set(name,[]);docEvents.get(name).push(fn);}};
 const field=id=>({id,tagName:'INPUT',type:'number',inCalc:true,disabled:false,readOnly:false,value:'',focuses:0,selects:0,top:600,setAttribute(){},focus(){this.focuses++;document.activeElement=this;},select(){this.selects++;},getBoundingClientRect(){return {top:this.top-main.scrollTop,bottom:this.top+44-main.scrollTop};},closest:()=>null});
 const width=field('largura'),length=field('comprimento'),quantity=field('quantidade'),packages=field('pacotesAdicionar'),nodes={largura:width,comprimento:length,quantidade:quantity,pacotesAdicionar:packages};
 const viewport={height:800,offsetTop:0,scale:1,addEventListener:(name,fn)=>viewEvents.set(name,fn)};
 const window={innerHeight:800,parent:{visualViewport:viewport},visualViewport:{height:800},frameElement:{getBoundingClientRect:()=>({top:0})},matchMedia:()=>media,addEventListener:(name,fn)=>windowEvents.set(name,fn)};
 const c={document,window,requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},setTimeout:fn=>timers.push(fn),MutationObserver:class{constructor(fn){mutations.push(fn);}observe(){}},$:id=>nodes[id],atualizarPrecoBitolaCalculadora(){}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/mobile-calculator-keyboard.js',import.meta.url),'utf8'),c);
 const flush=()=>{for(let n=0;frames.length&&n<20;n++)frames.shift()();};flush();
 const fire=(name,target,extra={})=>{let prevented=false,stopped=false;for(const fn of docEvents.get(name)||[])fn({target,cancelable:true,preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;},...extra});return {prevented,stopped};};
 const focus=el=>{fire('pointerdown',el);document.activeElement=el;fire('focusin',el);flush();};
 const resize=h=>{viewport.height=h;viewEvents.get('resize')?.();};
 const button={id:'btnLancar',tagName:'BUTTON',inCalc:true,closest:selector=>selector.includes('#btnLancar')||selector.includes('button')?button:null};
 return {c,document,window,viewport,viewEvents,docEvents,styles,main,width,length,quantity,packages,button,fire,focus,resize,flush,timers,api:window.__smCalcKeyboardV733,inactive(){calcActive=false;mutations.forEach(fn=>fn());flush();}};
}
test('launch tap retains editable focus, while touch scrolling is never canceled',()=>{
 const s=setup();s.focus(s.width);s.resize(430);s.flush();assert(s.fire('mousedown',s.button).prevented);assert.equal(s.document.activeElement,s.width);assert(!s.docEvents.has('touchmove'));assert(!s.docEvents.has('touchstart'));s.api.beginLaunch();assert(s.api.canRestoreFocus(s.width));
 const background={inCalc:true,closest:()=>null};assert(!s.fire('pointerdown',background).prevented);assert(s.fire('mousedown',background).prevented);
});
test('parent visual viewport fits the iframe and only reveals the field when keyboard opens or focus changes',()=>{
 const s=setup();s.focus(s.width);s.resize(430);s.flush();assert.equal(s.styles.get('--calc-visible-height-v733'),'430px');assert(s.main.scrollTop>0);
 s.main.scrollTop=50;s.viewEvents.get('scroll')();s.flush();assert.equal(s.main.scrollTop,50,'manual scrolling must not be pulled back to the field');
});
test('native hide arrow disarms delayed focus immediately, even before animation frame layout runs',()=>{
 const s=setup();s.focus(s.width);s.resize(430);s.flush();s.api.beginLaunch();assert(s.api.canRestoreFocus(s.width));s.resize(800);assert.equal(s.api.canRestoreFocus(s.width),false);s.fire('input',s.width,{isTrusted:true});assert.equal(s.api.canRestoreFocus(s.width),false,'IME commit on hide must not re-arm the keyboard');s.flush();assert.equal(s.document.activeElement,s.width,'hide may leave the DOM input focused');assert.equal(s.api.canRestoreFocus(s.width),false);
 s.focus(s.width);s.api.beginLaunch();assert(s.api.canRestoreFocus(s.width),'an explicit new field tap allows typing again');
});
test('another field or leaving the calculator cancels a pending return to width; desktop remains native',()=>{
 const s=setup();s.focus(s.width);s.api.beginLaunch();s.focus(s.length);assert.equal(s.api.canRestoreFocus(s.width),false);s.inactive();assert.equal(s.api.canRestoreFocus(s.length),false);
 const desktop=setup({mobile:false});assert.equal(desktop.fire('mousedown',desktop.button).prevented,false);assert.equal(desktop.api.canRestoreFocus(desktop.width),true);assert(!desktop.styles.has('--calc-visible-height-v733'));
});
test('packages Enter no longer blurs the mobile input',()=>{
 const s=setup();s.focus(s.packages);const event=s.fire('keydown',s.packages,{key:'Enter'});assert(event.prevented);assert(event.stopped);
});
test('real generated post-launch callbacks preserve quickly typed digits and respect native keyboard dismissal',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),app=JSON.parse(html.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]),start=app.indexOf('function prepararProximoLancamentoM3(){'),end=app.indexOf('// Renderizações fora da tela',start);assert(start>=0&&end>start);
 const s=setup();vm.runInContext(app.slice(start,end),s.c);s.focus(s.width);s.api.beginLaunch();s.width.value='12';s.fire('input',s.width,{isTrusted:true});s.c.prepararProximoLancamentoM3();assert.equal(s.width.value,'12','an async launch must not clear the next edit');s.api.beginLaunch();s.width.value='10';s.c.prepararProximoLancamentoM3();s.width.value='12';s.flush();s.timers.splice(0).forEach(fn=>fn());assert.equal(s.width.value,'12');
 s.resize(430);s.flush();s.api.beginLaunch();s.width.value='10';s.c.prepararProximoLancamentoM3();const focusCount=s.width.focuses,selectCount=s.width.selects;s.resize(800);s.flush();s.timers.splice(0).forEach(fn=>fn());assert.equal(s.width.focuses,focusCount);assert.equal(s.width.selects,selectCount);
});
