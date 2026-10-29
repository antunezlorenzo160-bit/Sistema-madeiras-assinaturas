import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {applyOfflineBoot} from '../scripts/offline-boot.mjs';
const origin='https://preview.example',source=readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(){
 const handlers={},stores=new Map();let online=true,status=200,claims=0,fetches=0;
 const key=r=>new URL(typeof r==='string'?r:r.url,origin).href;
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);return {async match(r){return entries.get(key(r))?.clone()},async put(r,v){entries.set(key(r),v.clone())}}},async keys(){return [...stores.keys()]},async delete(k){return stores.delete(k)}};
 vm.runInNewContext(source,{self:{location:{origin},clients:{async claim(){claims++}},async skipWaiting(){},addEventListener:(type,fn)=>handlers[type]=fn},caches,URL,Request,AbortController,setTimeout,clearTimeout,fetch:async r=>{fetches++;if(!online)throw Error('offline');return new Response('public-asset:'+key(r),{status})}});
 async function lifecycle(type){let p;handlers[type]({waitUntil(v){p=v}});await p}
 async function fetchPath(path,mode='navigate',method='GET'){let p;handlers.fetch({request:{url:new URL(path,origin).href,method,mode},respondWith(v){p=v}});return p}
 return {stores,lifecycle,fetchPath,handlers,offline(){online=false},online(){online=true},badNetwork(){status=503},get fetches(){return fetches},get claims(){return claims}};
}
test('a fresh worker prepares all assets and starts a new navigation with no open tab or network',async()=>{
 const w=worker();await w.lifecycle('install');await w.lifecycle('activate');assert.equal(w.claims,1);assert.equal(w.fetches,5);w.offline();for(const [path,mode] of [['/','navigate'],['/index.html','navigate'],['/?atualizacao=offline','navigate'],['/toras.mjs','cors'],['https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js','cors']]){const response=await w.fetchPath(path,mode);assert.equal(response.status,200);assert.match(await response.text(),/public-asset/)}
});
test('API, signature and other private URLs never enter the shell cache',async()=>{
 const w=worker();await w.lifecycle('install');assert.equal(await w.fetchPath('/.netlify/functions/company-contract'),undefined);assert.equal(await w.fetchPath('/?assinatura=private'),undefined);assert.equal(await w.fetchPath('/plataforma/'),undefined);assert.equal(await w.fetchPath('/', 'navigate','POST'),undefined);assert.equal([...w.stores.values()][0].size,5);
});
test('temporary server errors fall back to the saved shell',async()=>{const w=worker();await w.lifecycle('install');w.badNetwork();assert.equal((await w.fetchPath('/')).status,200)});
test('preparation repairs an evicted module and reports failure instead of a false ready state',async()=>{
 const w=worker();await w.lifecycle('install');const entries=[...w.stores.values()][0];entries.delete(origin+'/toras.mjs');let reply,p;
 w.handlers.message({data:{type:'SM_PREPARE_OFFLINE'},ports:[{postMessage:x=>reply=x}],waitUntil:x=>p=x});await p;assert.equal(reply.ok,true);assert.ok(entries.has(origin+'/toras.mjs'));
 entries.delete(origin+'/toras.mjs');w.offline();w.handlers.message({data:{type:'SM_PREPARE_OFFLINE'},ports:[{postMessage:x=>reply=x}],waitUntil:x=>p=x});await p;assert.equal(reply.ok,false);
});
test('boot script runs before Firebase and retains account verification and pending writes',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),result=applyOfflineBoot(html);assert.ok(result.indexOf('<script id="offline-boot-v5">')<result.indexOf('<script type="module">'));assert.ok(result.includes('await window.__smPrepararArquivosOffline(tentarNovamente);'));assert.ok(result.includes('await lerVinculoOffline(uid);'));assert.equal(applyOfflineBoot(result),result);
});
