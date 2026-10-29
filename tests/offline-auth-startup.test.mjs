import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../ui/offline-auth-network.js',import.meta.url),'utf8');
function setup(online=true,fetchImpl=async()=>new Response('{}')){
 const calls=[],window={location:{href:'https://preview.example/'},fetch:async(...args)=>{calls.push(args);return fetchImpl(...args)}};
 vm.runInNewContext(source,{window,navigator:{onLine:online},URL,AbortController,TypeError,setTimeout:(f,ms)=>setTimeout(f,ms===1500?15:ms),clearTimeout});return {window,calls};
}
const lookup='https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=public';
test('offline session checks fail immediately without touching the network or inventing a session',async()=>{
 const s=setup(false);await assert.rejects(s.window.fetch(lookup),/network unavailable/);assert.equal(s.calls.length,0);assert.equal(s.window.__smAuthNetworkUnavailable,true);assert.equal(s.window.auth,undefined);
});
test('unresponsive saved-session checks time out and abort, letting Firebase use its own network failure path',async()=>{
 let signal;const s=setup(true,async(_,opts)=>{signal=opts.signal;return new Promise(()=>{})});await assert.rejects(s.window.fetch(lookup),/network timeout/);assert.equal(signal.aborted,true);assert.equal(s.window.__smAuthNetworkUnavailable,true);
});
test('explicit server rejection is passed through unchanged',async()=>{
 const response=new Response('{"error":{"message":"USER_DISABLED"}}',{status:400}),s=setup(true,async()=>response);
 assert.equal(await s.window.fetch(lookup),response);assert.equal(s.window.__smAuthNetworkUnavailable,false);
});
test('normal app requests, sign-in and post-restoration calls use the original fetch',async()=>{
 const s=setup(false);for(const url of ['https://preview.example/.netlify/functions/platform-admin','https://firestore.googleapis.com/api','https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'])assert.equal((await s.window.fetch(url)).status,200);
 s.window.__smConcluirRestauracaoAuth();assert.equal((await s.window.fetch(lookup)).status,200);assert.equal(s.calls.length,4);
});
test('network errors propagate while refreshing a stored token',async()=>{
 const s=setup(true,async()=>{throw new TypeError('network')});await assert.rejects(s.window.fetch('https://securetoken.googleapis.com/v1/token'),/network/);assert.equal(s.window.__smAuthNetworkUnavailable,true);
});
test('offline fallback is limited to restoration and keeps cached membership checks',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.ok(html.includes('async function abrirSessaoV492(restaurando=false)'));assert.ok(html.includes('restaurando&&window.__smAuthNetworkUnavailable===true'));assert.ok(html.includes('await lerVinculoOffline(uid);'));assert.ok(html.includes('registro?.bloqueado===true'));assert.ok(html.includes('await authSdk.signInWithEmailAndPassword(auth,email,password)'));assert.ok(html.includes('await abrirSessaoV492();'));
});
test('fresh legacy source accepts the offline condition before company onboarding transforms it',async()=>{
 const {applyOfflineBoot}=await import('../scripts/offline-boot.mjs');
 const source=`<html><script type="module">const TEMPLATE="";
   let registration=await window.__smOfflineRegistration;
async function abrirSessaoV492(){
 if(!navigator.onLine){
  const empresaId=expected[uid];
  if(!empresaId)throw Error('Conta fora deste ensaio.');
  await lerVinculoOffline(uid);
 }
}
await auth.authStateReady();if(auth.currentUser){$('lembrar').checked=true;await abrirSessaoV492();return}
</script></html>`;
 const built=applyOfflineBoot(source);assert.ok(built.includes('restaurando&&window.__smAuthNetworkUnavailable===true'));assert.ok(built.includes("  const empresaId=expected[uid];\n  if(!empresaId)throw Error('Conta fora deste ensaio.');\n  await lerVinculoOffline(uid);"));assert.equal(applyOfflineBoot(built),built);
});
