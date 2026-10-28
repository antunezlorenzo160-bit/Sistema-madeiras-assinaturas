import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import {createCompanyManagement} from '../public/plataforma/company-management.mjs';

function setup({response={ok:true,json:async()=>({})}}={}){
  const elements=new Map();let authChanged,requests=0;
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,value:'',disabled:false,classList:{toggle(){}},textContent:'',addEventListener(){}});return elements.get(id);};
  const user={uid:'owner',emailVerified:true,getIdToken:async()=> 'valid-token'};
  const auth={currentUser:user};
  const context=vm.createContext({createCompanyManagement,document:{getElementById:element,querySelectorAll:()=>[]},
    initializeApp:()=>({}),initializeAuth:()=>auth,browserLocalPersistence:{},inMemoryPersistence:{},
    onAuthStateChanged:(a,callback)=>{authChanged=callback;},
    signInWithEmailAndPassword:async()=>({user}),signOut:async()=>{},sendEmailVerification:async()=>{},
    fetch:async()=>{requests++;return response;},AbortController,setTimeout,clearTimeout,console});
  const source=readFileSync(new URL('../public/plataforma/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source,context);vm.runInContext('render=()=>{}',context);
  element('email').value='antunezlorenzo160@gmail.com';element('password').value='test-password';
  return {element,context,authChanged,user,requests:()=>requests};
}
test('same-account login opens administration even when Firebase emits no auth-state event',async()=>{
  const app=setup(),button={disabled:false};
  await app.element('login-form').onsubmit({preventDefault(){},submitter:button});
  assert.equal(app.element('app').hidden,false);assert.equal(app.element('login').hidden,true);
  assert.equal(button.disabled,false);assert.equal(app.element('password').value,'');assert.equal(app.requests(),1);
});
test('API errors are displayed and allow retry instead of leaving verification running',async()=>{
  const app=setup({response:{ok:false,json:async()=>({error:'Acesso exclusivo do proprietário.'})}}),button={disabled:false};
  await app.element('login-form').onsubmit({preventDefault(){},submitter:button});
  assert.equal(app.element('login-status').textContent,'Acesso exclusivo do proprietário.');
  assert.equal(app.element('app').hidden,true);assert.equal(button.disabled,false);
});
test('deadline rejects a stalled operation and cancels it',async()=>{
  const app=setup();let canceled=false;app.context.cancel=()=>{canceled=true;};
  await assert.rejects(vm.runInContext('withDeadline(()=>new Promise(()=>{}),5,cancel)',app.context),/demorou demais/);
  assert.equal(canceled,true);
});
test('contract simulation shows the selected price without requests or subscription changes',()=>{
  const app=setup();
  vm.runInContext(`state={companies:[{id:'company',name:'Serraria'}],plans:[{id:'plan',name:'Completo',amountCents:19990,interval:'monthly'}],subscriptions:[{empresaId:'company',status:'trial',trialMode:'indefinite'}]}`,app.context);
  app.element('subscription-company').value='company';app.element('subscription-plan').value='plan';
  const before=vm.runInContext('JSON.stringify(state)',app.context);
  app.element('subscription-simulate').onclick();
  assert.equal(app.element('subscription-simulation').hidden,false);
  assert.match(app.element('subscription-simulation-summary').textContent,/199,90 por mês/);
  assert.equal(vm.runInContext('JSON.stringify(state)',app.context),before);
  assert.equal(app.requests(),0);
  vm.runInContext("state.plans[0].interval='yearly'",app.context);
  app.element('subscription-simulate').onclick();
  assert.match(app.element('subscription-simulation-summary').textContent,/199,90 por ano/);
  vm.runInContext('state.plans[0].active=false',app.context);
  app.element('subscription-simulate').onclick();
  assert.equal(app.element('subscription-simulation').hidden,true);
  assert.match(app.element('status').textContent,/indisponível/);
  assert.equal(app.requests(),0);
});

test('annual and monthly presets fill drafts without requests; annual automatic choice remains a simulation',()=>{
 const app=setup();app.element('plan-preset-yearly').onclick();
 assert.equal(app.element('plan-amount').value,'2000.00');assert.equal(app.element('plan-interval').value,'yearly');
 app.element('plan-preset-monthly').onclick();assert.equal(app.element('plan-amount').value,'199.90');assert.equal(app.element('plan-interval').value,'monthly');
 vm.runInContext(`state={companies:[{id:'company',name:'Serraria'}],plans:[{id:'annual',name:'Completo Anual',amountCents:200000,interval:'yearly'}],subscriptions:[{empresaId:'company',status:'trial',trialMode:'indefinite'}]}`,app.context);
 app.element('subscription-company').value='company';app.element('subscription-plan').value='annual';app.element('subscription-renewal').value='automatic';
 const before=vm.runInContext('JSON.stringify(state)',app.context);app.element('subscription-simulate').onclick();
 const summary=app.element('subscription-simulation-summary').textContent;
 assert.match(summary,/2\.000,00 por ano/);assert.match(summary,/somente simulação/);assert.match(summary,/Pagamento único pelos 12 meses/);
 assert.equal(vm.runInContext('JSON.stringify(state)',app.context),before);assert.equal(app.requests(),0);
});
