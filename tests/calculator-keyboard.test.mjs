import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function setup(){let handler,clicks=0,desktop=true,active=true;const launch={disabled:false,offsetParent:{},click(){clicks++}},calculator={classList:{contains:()=>active},contains:x=>x.inCalc===true};
 vm.runInNewContext(readFileSync(new URL('../ui/calculator-keyboard.js',import.meta.url),'utf8'),{document:{getElementById:id=>id==='calculadora'?calculator:launch,addEventListener:(_,fn)=>handler=fn},window:{matchMedia:()=>({matches:desktop})}});
 const press=(target,extra={})=>{let prevented=false;handler({code:'Space',key:' ',target,preventDefault(){prevented=true},stopPropagation(){},...extra});return prevented};
 return {press,launch,get clicks(){return clicks},mobile(){desktop=false},inactive(){active=false}};
}
test('every numeric launch field invokes the same button without altering its value',()=>{
 const x=setup();for(const id of ['largura','espessura','comprimento','quantidade','pacotesAdicionar','volumeGranelV384','volumeFechadoV387','granelLargura','granelComprimento','granelAltura']){const input={id,tagName:'INPUT',inCalc:true,value:'3.10'};assert.equal(x.press(input),true);assert.equal(input.value,'3.10')}assert.equal(x.clicks,10);
});
test('names, services, selects, buttons, dialogs and unrelated fields retain native Space behavior',()=>{
 const x=setup();for(const t of [{tagName:'INPUT',id:'nomeOrigemDestino',inCalc:true},{tagName:'INPUT',id:'chkEndireitamento',inCalc:true},{tagName:'SELECT',inCalc:true},{tagName:'BUTTON',inCalc:true},{tagName:'TEXTAREA',inCalc:true},{isContentEditable:true,inCalc:true},{tagName:'INPUT',id:'largura',inCalc:false},{tagName:'DIV',closest:()=>({})}])assert.equal(x.press(t),false);assert.equal(x.clicks,0);
});
test('no repeated, modified, hidden, inactive or mobile launch',()=>{
 const x=setup(),t={tagName:'INPUT',id:'comprimento',inCalc:true};for(const extra of [{repeat:true},{isComposing:true},{ctrlKey:true},{shiftKey:true},{altKey:true},{metaKey:true},{defaultPrevented:true}])assert.equal(x.press(t,extra),false);
 x.launch.disabled=true;assert.equal(x.press(t),false);x.launch.disabled=false;x.launch.offsetParent=null;assert.equal(x.press(t),false);x.launch.offsetParent={};x.mobile();assert.equal(x.press(t),false);assert.equal(x.clicks,0);
 const y=setup();y.inactive();assert.equal(y.press(t),false);
});
