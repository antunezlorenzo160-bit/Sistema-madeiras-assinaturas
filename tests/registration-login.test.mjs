import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
function setup({valid=true,online=true}={}){
 const elements=new Map(),calls=[];const node=id=>{if(!elements.has(id))elements.set(id,{value:'',type:id==='password'?'password':'',selectionStart:2,validity:{valid},disabled:false,hidden:false,attributes:{},focus(){},setSelectionRange(){},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){}});return elements.get(id);};
 const auth={currentUser:null};const user={emailVerified:false,reload:async()=>{}};
 const sign=async(a,email,password)=>{calls.push({sign:true,email,password});auth.currentUser=user;return {user};};
 const context=vm.createContext({initializeApp:()=>({}),initializeAuth:()=>auth,browserLocalPersistence:{},inMemoryPersistence:{},createUserWithEmailAndPassword:sign,signInWithEmailAndPassword:sign,signOut:async()=>{},sendEmailVerification:async()=>{},sendPasswordResetEmail:async(a,email)=>calls.push({reset:true,email}),document:{getElementById:node,querySelectorAll:()=>[node('forgot-password'),node('submit'),node('toggle-password')]},navigator:{onLine:online},location:{hash:'#convite=test-token'},URLSearchParams,setTimeout,clearTimeout,AbortController,fetch:()=>{throw Error('Unexpected registration call');}});
 const source=readFileSync(new URL('../public/cadastro/app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');vm.runInContext(source,context);node('email').value=' owner@example.com ';return {node,calls};
}
test('registration reset does not require a company name or password and does not redeem the invitation',async()=>{
 const s=setup();await s.node('forgot-password').onclick();assert.deepEqual(s.calls,[{reset:true,email:'owner@example.com'}]);assert.match(s.node('status').textContent,/Se houver uma conta/);assert.equal(s.node('submit').disabled,false);
 for(const options of [{valid:false},{online:false}]){const t=setup(options);await t.node('forgot-password').onclick();assert.equal(t.calls.length,0);}
});
test('registration eye never submits; starting registration masks and clears the password',async()=>{
 const s=setup();s.node('password').value='existing-password';s.node('mode').value='create';s.node('toggle-password').onclick();assert.equal(s.node('password').type,'text');assert.equal(s.calls.length,0);assert.equal(s.node('toggle-password').attributes['aria-label'],'Ocultar senha');
 s.node('register-form').onsubmit({preventDefault(){}});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(s.node('password').type,'password');assert.equal(s.node('password').value,'');assert.equal(s.calls[0].password,'existing-password');assert.equal(s.node('verification').hidden,false);
});
