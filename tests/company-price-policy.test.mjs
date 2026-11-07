import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {normalizePricePolicy} from '../public/document-pricing.mjs';
class PlatformError extends Error{constructor(status,message){super(message);this.status=status;}}
function setup(options={}){
 const records=new Map([['membros/user',{ativo:true,empresaId:'tenant'}]]),writes=[];
 const ref=path=>({path,async get(){return {exists:records.has(path),data:()=>records.get(path)};}});
 const db={doc:ref,async runTransaction(fn){return fn({get:r=>r.get(),set(r,v){writes.push(r.path);records.set(r.path,v);}});}};
 const identity={uid:'user',emailVerified:true,db};let ownerCalls=0;
 const owner=async()=>{ownerCalls++;if(options.employee)throw new PlatformError(403,'Somente responsável.');return {empresaId:options.swap&&ownerCalls>1?'other':'tenant',ownerUid:'user'};};
 const source=readFileSync(new URL('../Netlify/Funtions/company-price-policy.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default async function handler','return async function handler');
 const json=(status,body)=>({status,body});const handler=new Function('authenticate','failure','json','PlatformError','employeeOwnerContext','normalizePricePolicy',source)(async()=>identity,e=>json(e.status||500,{error:e.message}),json,PlatformError,owner,normalizePricePolicy);
 const req=body=>({method:body?'POST':'GET',text:async()=>JSON.stringify(body)});
 return {handler,req,records,writes,identity};
}
test('defaults disabled and saves only authenticated tenant; supplied tenant cannot redirect write',async()=>{
 const s=setup();assert.equal((await s.handler(s.req())).body.policy.enabled,false);
 const r=await s.handler(s.req({enabled:true,limits:{m3:1},revision:0,empresaId:'forged'}));assert.equal(r.status,200);assert.equal(r.body.policy.revision,1);assert.deepEqual(s.writes,['empresas/tenant/configuracao/precos']);
});
test('employee, inactive or unverified identities cannot alter company policy',async()=>{
 for(const mode of ['employee','inactive','unverified']){const s=setup({employee:mode==='employee'});if(mode==='inactive')s.records.get('membros/user').ativo=false;if(mode==='unverified')s.identity.emailVerified=false;const r=await s.handler(s.req({enabled:true,limits:{m3:1}}));assert.equal(r.status,403);assert.equal(s.writes.length,0);}
});
test('stale version, invalid limit, and changed membership fail before writes',async()=>{
 const stale=setup();stale.records.set('empresas/tenant/configuracao/precos',{revision:2});assert.equal((await stale.handler(stale.req({revision:1,limits:{m3:1}}))).status,409);assert.equal(stale.writes.length,0);
 const invalid=setup();assert.equal((await invalid.handler(invalid.req({limits:{m3:-1}}))).status,400);assert.equal(invalid.writes.length,0);
 const swap=setup({swap:true});assert.equal((await swap.handler(swap.req({limits:{m3:1}}))).status,409);assert.equal(swap.writes.length,0);
});
