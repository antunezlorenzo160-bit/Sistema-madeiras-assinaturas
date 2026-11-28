import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../ui/calculator-launch-performance.js',import.meta.url),'utf8');
function setup(){
 let seq=0;const frames=new Map(),events={},pending=new Map(),calls=[],visible=new Set(['#calculadora']);const c={console,lotePacotesEmCurso:false,save:()=>calls.push('save'),queueStockChartsV720(){},requestAnimationFrame:fn=>{const id=++seq;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),window:{addEventListener:(name,fn)=>events[name]=fn},document:{addEventListener:(name,fn)=>events[name]=fn},diferirRenderizacaoV595:(name,selector,fn)=>{if(visible.has(selector))return false;pending.set(name,{selector,fn});return true;}};
 for(const name of ['renderLancamentos','renderOrcamento','pcAtualizarPlanilhaDirecionada','renderPlanilhasM3Especies','renderEstoqueLancamentos','renderEstoque','renderHistoricoPlanilhasEstoque'])c[name]=()=>calls.push(name);
 vm.createContext(c);vm.runInContext(source,c);return {c,frames,calls,pending,events,visible,step(){const list=[...frames.values()];frames.clear();for(const fn of list)fn();}};
}
test('rapid load launches paint once after the reset frame, with hidden stock/history deferred',()=>{
 const s=setup();s.c.atualizarTelasAposLancamento('carga');s.c.atualizarTelasAposLancamento('carga');assert.deepEqual(s.calls,[],'load already saves before this UI call; no duplicate save');assert.equal(s.frames.size,1);s.step();assert.deepEqual(s.calls,[],'input reset can paint before table work');s.step();assert.deepEqual(s.calls,['renderLancamentos']);assert(s.pending.has('renderEstoque'));assert(s.pending.has('renderHistoricoPlanilhasEstoque'));assert.equal(s.frames.size,0);
 s.visible.add('#estoqueHistoricoPainel');const pending=s.pending.get('renderHistoricoPlanilhasEstoque');pending.fn();assert.equal(s.calls.at(-1),'renderHistoricoPlanilhasEstoque');
});
test('non-load persistence is immediate and a print flush uses the latest destination updates',()=>{
 const s=setup();s.c.atualizarTelasAposLancamento('orcamento');assert.deepEqual(s.calls,['save']);s.c.atualizarTelasAposLancamento('estoque2');assert.deepEqual(s.calls,['save','save']);s.events.beforeprint();assert.equal(s.frames.size,0);assert.equal(s.calls.filter(x=>x==='renderLancamentos').length,1);assert(s.pending.has('renderOrcamento'));assert(s.pending.has('renderEstoque'));s.events.beforeprint();assert.equal(s.calls.filter(x=>x==='renderLancamentos').length,1);
});
test('unchanged summary HTML keeps existing row DOM; real changes still update it',()=>{
 const s=setup();let writes=0,html='';const node={set innerHTML(v){writes++;html=v;},get innerHTML(){return html;}};s.c.stableCalculatorHtmlV831(node,'<tr>A</tr>');s.c.stableCalculatorHtmlV831(node,'<tr>A</tr>');assert.equal(writes,1);s.c.stableCalculatorHtmlV831(node,'<tr>B</tr>');assert.equal(writes,2);assert.equal(html,'<tr>B</tr>');
});
test('PDF/copy click flushes pending paint and a storage failure cannot schedule a misleading update',()=>{
 const s=setup();s.c.atualizarTelasAposLancamento('carga');s.events.click({target:{closest:()=>({})}});assert.equal(s.calls.filter(x=>x==='renderLancamentos').length,1);assert.equal(s.frames.size,0);
 const fail=setup();fail.c.save=()=>{throw Error('Sem espaço');};assert.throws(()=>fail.c.atualizarTelasAposLancamento('estoque1'),/Sem espaço/);assert.equal(fail.frames.size,0);
});
test('generated summary and waiting-load panel use stable HTML without altering pricing or persistence',()=>{
 const raw=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),app=JSON.parse(raw.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]);assert(app.includes('stableCalculatorHtmlV831(tb,grupos.length?'));assert(app.includes('stableCalculatorHtmlV831(hostEspecies,especiesTotais.map'));assert(app.includes("stableCalculatorHtmlV831(painel,'<div"));assert(app.includes("save([STORAGE.lancamentos,'carregamentos_lancamentos_v1']);"));
});
