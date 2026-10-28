import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup({valid=true,online=true,error}={}){
 const elements=new Map(),calls=[];const node=id=>{if(!elements.has(id))elements.set(id,{value:'',type:id==='password'?'password':'',selectionStart:2,validity:{valid},disabled:false,hidden:false,attributes:{},focus(){},setSelectionRange(){},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){}});return elements.get(id);};
 const auth={currentUser:null};
 const context=vm.createContext({initializeApp:()=>({}),initializeAuth:()=>auth,browserLocalPersistence:{},inMemoryPersistence:{},onAuthStateChanged(){},signInWithEmailAndPassword:async(a,email,password)=>calls.push({login:true,email,password}),signOut:async()=>{},sendPasswordResetEmail:async(a,email)=>{calls.push({email});if(error)throw {code:error};},document:{getElementById:node,querySelectorAll:()=>[node('forgot-password'),node('login-submit'),node('toggle-password')]},navigator:{onLine:online},setTimeout,clearTimeout,AbortController});
 const source=readFileSync(new URL('../public/contratacao/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(source,context);
 node('email').value=' owner@example.com ';return {node,calls,context};
}
test('reset uses only the trimmed email and never requires or changes the password',async()=>{
 const s=setup();s.node('password').value='existing-password';await s.node('forgot-password').onclick();
 assert.deepEqual(s.calls,[{email:'owner@example.com'}]);assert.equal(s.node('password').value,'existing-password');assert.match(s.node('status').textContent,/Se houver uma conta/);assert.equal(s.node('forgot-password').disabled,false);assert.equal(s.node('login-submit').disabled,false);
});
test('invalid email and offline requests do not call Firebase; errors permit retry',async()=>{
 for(const options of [{valid:false},{online:false}]){const s=setup(options);await s.node('forgot-password').onclick();assert.equal(s.calls.length,0);assert.equal(s.node('forgot-password').disabled,false);}
 const s=setup({error:'auth/too-many-requests'});await s.node('forgot-password').onclick();assert.match(s.node('status').textContent,/Muitas tentativas/);assert.equal(s.node('forgot-password').disabled,false);
});
test('eye toggles visibility and accessible labels without sending a login; login remasks and clears the field',async()=>{
 const s=setup();s.node('password').value='existing-password';s.node('toggle-password').onclick();assert.equal(s.node('password').type,'text');assert.equal(s.node('toggle-password').attributes['aria-label'],'Ocultar senha');assert.equal(s.calls.length,0);
 s.node('toggle-password').onclick();assert.equal(s.node('password').type,'password');assert.equal(s.node('toggle-password').attributes['aria-pressed'],'false');
 s.node('toggle-password').onclick();await s.node('login-form').onsubmit({preventDefault(){}});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(s.node('password').type,'password');assert.equal(s.node('password').value,'');assert.equal(s.calls[0].password,'existing-password');
});

test('refresh renders zero-priced options and preserves the previous request as historical data',async()=>{
 const s=setup(),options=[];s.context.Option=class{constructor(text,value){this.text=text;this.value=value;}};
 s.node('plan').replaceChildren=()=>{options.length=0;s.node('plan').value='';};s.node('plan').add=option=>{options.push(option);if(options.length===1)s.node('plan').value=option.value;};
 s.context.responseData={company:{name:'Empresa'},offers:[{id:'monthly',name:'Mensal',amountCents:0,interval:'monthly',revision:2},{id:'annual',name:'Anual',amountCents:0,interval:'yearly',revision:2}],request:{planName:'Mensal',amountCents:19990,interval:'monthly',renewalPreference:'manual',requestedAt:100}};
 vm.runInContext('api=async()=>responseData',s.context);await vm.runInContext('load()',s.context);
 assert.equal(options.length,2);assert.match(options[0].text,/0,00/);assert.match(s.node('plan-description').textContent,/Gratuito/);assert.equal(s.node('request-submit').disabled,false);
 assert.match(s.node('request-summary').textContent,/199,90/);assert.match(s.node('request-summary').textContent,/Valor registrado na solicitação/);
});

test('company screen preserves the locked annual price and hides repricing until the renewal window',()=>{
 const s=setup();s.context.periodData={planName:'Completo Anual',amountCents:200000,interval:'yearly',startsAt:Date.parse('2026-10-28T13:00:00Z'),endsAt:Date.parse('2027-10-28T13:00:00Z'),active:true,renewalOpen:false};
 vm.runInContext('showPeriod(periodData)',s.context);assert.equal(s.node('choice-card').hidden,true);assert.match(s.node('period-summary').textContent,/2\.000,00/);assert(!s.node('period-renewal').textContent.includes('2.500'));
 Object.assign(s.context.periodData,{renewalOpen:true,priceChanged:true,nextTerms:{amountCents:250000,interval:'yearly'}});vm.runInContext('showPeriod(periodData)',s.context);
 assert.equal(s.node('choice-card').hidden,false);assert.match(s.node('period-summary').textContent,/2\.000,00/);assert.match(s.node('period-renewal').textContent,/2\.500,00/);assert.match(s.node('period-renewal').textContent,/próximo período/);
});
