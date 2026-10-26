import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(){
 let next,fail,message,reads=0;const nodes=new Map();
 const header={append(box){nodes.set(box.id,box);}};
 const context=vm.createContext({db:{},boundV456:{uid:'uid'},empresaV456:'tenant',readyV456:true,authV456:{currentUser:{uid:'uid'}},
  rawDocV456:(db,collection,uid)=>{assert.equal(collection,'membros');assert.equal(uid,'uid');return {};},
  onSnapshot:(ref,options,callback,error)=>{reads++;next=callback;fail=error;return()=>{};},parent:{__v456Error:text=>{message=text;}},
  document:{getElementById:id=>nodes.get(id),querySelector:()=>header,createElement:()=>({style:{},setAttribute(){},remove(){nodes.delete(this.id);}})}});
 vm.runInContext(readFileSync(new URL('../ui/company-access.js',import.meta.url),'utf8')+'\nacompanharAcessoEmpresaV707()',context);
 return {next:data=>next({metadata:{fromCache:false,hasPendingWrites:false},exists:()=>true,data:()=>data}),
  cached:()=>next({metadata:{fromCache:true}}),nodes,message:()=>message,reads:()=>reads,context};
}
test('one membership listener shows and clears a trial notice without timers or additional reads',()=>{
 const s=setup();s.next({ativo:true,empresaId:'tenant',avisoPlataforma:{kind:'trial_end',endDate:'2099-11-15',endsAt:Date.parse('2099-11-16')}});
 assert(s.nodes.get('avisoPlataformaV707').textContent.includes('15/11/2099'));assert.equal(s.reads(),1);
 s.next({ativo:true,empresaId:'tenant',avisoPlataforma:null});assert.equal(s.nodes.size,0);assert.equal(s.reads(),1);
});
test('server suspension or tenant reassignment closes the session; cached data alone does not',()=>{
 const s=setup();s.cached();assert.equal(s.message(),undefined);
 s.next({ativo:false,empresaId:'tenant'});assert(s.message().includes('suspenso'));assert.equal(vm.runInContext('readyV456',s.context),false);
 const reassigned=setup();reassigned.next({ativo:true,empresaId:'other'});assert(reassigned.message().includes('alterado'));
});
