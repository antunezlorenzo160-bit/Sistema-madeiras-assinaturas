import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {applyRuntimeEfficiencyV782} from '../scripts/runtime-efficiency-build.mjs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),start=html.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}const app=JSON.parse(html.slice(start,end));
test('load polling does no initial or hidden work, still refreshes active load changes and preserves forms in editing',()=>{
 const begin=app.indexOf("  // RUNTIME_EFFICIENCY_V782"),finish=app.indexOf('\n})();',begin),timers=[],initial=[];let scans=0,renders=0,revision=1,editing=false;
 const c={document:{hidden:false,activeElement:null},orcSubaba:'atual',lotePacotesEmCurso:false,assinaturaCargasV414:()=>{scans++;return String(revision);},cargaComEdicaoPendenteV408:()=>editing,renderCarregamentosV392:()=>renders++,setInterval:fn=>timers.push(fn),setTimeout:fn=>initial.push(fn)};
 vm.createContext(c);vm.runInContext(app.slice(begin,finish),c);assert.equal(scans,0);initial[0]();timers[0]();assert.equal(scans,0);assert.equal(renders,0);
 c.orcSubaba='carregamentos';timers[0]();assert.equal(scans,1);assert.equal(renders,1);timers[0]();assert.equal(renders,1);
 c.document.hidden=true;revision++;timers[0]();assert.equal(scans,2);c.document.hidden=false;editing=true;timers[0]();assert.equal(renders,1);editing=false;timers[0]();assert.equal(renders,2);
 c.lotePacotesEmCurso=true;timers[0]();assert.equal(renders,2);assert.equal(scans,4);
});
test('runtime optimization build is repeatable and refuses changed source',()=>{assert.equal(applyRuntimeEfficiencyV782(app),app);assert.throws(()=>applyRuntimeEfficiencyV782('unknown'));});
