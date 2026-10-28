import test from 'node:test';import assert from 'node:assert/strict';
import {companyContractOverview,requestCompanyContract} from '../Netlify/Funtions/lib/company-contract.mjs';
function setup(){
 const root='plataforma_admin/billing',records=new Map([
 ['membros/owner',{empresaId:'tenant',ativo:true,papel:'admin'}],
 [`${root}/companies/tenant`,{name:'Empresa',ownerUid:'owner'}],
 [`${root}/plans/monthly`,{name:'Completo',active:true,amountCents:19990,interval:'monthly',updatedAt:10}],
 [`${root}/plans/yearly`,{name:'Completo Anual',active:true,amountCents:200000,interval:'yearly',updatedAt:11}],
 [`${root}/plans/monthly-copy`,{name:'Completo',active:true,amountCents:19990,interval:'monthly',updatedAt:10}],
 [`${root}/plans/other`,{name:'Outro',active:true,amountCents:1,interval:'monthly'}],
 [`${root}/subscriptions/tenant`,{status:'trial',trialMode:'indefinite'}]
 ]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>records.get(path)});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>({limit:()=>({get:async()=>{const docs=[...records.keys()].filter(k=>k.startsWith(path+'/')).map(snap);return {docs,size:docs.length};}})}),runTransaction:async fn=>{
  let writing=false;return fn({get:async ref=>{assert(!writing);return snap(ref.path);},set:(ref,data)=>{writing=true;writes.push(ref.path);records.set(ref.path,data);},create:(ref,data)=>{writing=true;assert(!records.has(ref.path));writes.push(ref.path);records.set(ref.path,data);}});
 }};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true},input:{planId:'yearly',expectedAmountCents:200000,expectedInterval:'yearly',revision:11,renewalPreference:'automatic',simulationOnly:true}};
}
test('catalog exposes only the two approved offers and derives tenant from membership',async()=>{
 const s=setup(),r=await companyContractOverview(s.db,s.identity);assert.equal(r.offers.length,2);assert.equal(r.company.empresaId,'tenant');assert.equal(r.automaticBilling,false);assert.equal(s.writes.length,0);
});
test('request stores an immutable quote without changing trial or access; repeats are idempotent',async()=>{
 const s=setup(),r=await requestCompanyContract(s.db,s.identity,{...s.input,empresaId:'another-company'},1234);
 assert.equal(r.request.empresaId,'tenant');assert.equal(r.request.amountCents,200000);assert.equal(r.request.automaticBilling,false);assert.equal(r.request.simulationOnly,true);
 assert.deepEqual(s.records.get('plataforma_admin/billing/subscriptions/tenant'),{status:'trial',trialMode:'indefinite'});assert.equal(s.records.get('membros/owner').ativo,true);
 assert(s.writes.every(p=>p.includes('/contract_requests/')||p.includes('/audit/events/')));
 const count=s.writes.length;assert.equal((await requestCompanyContract(s.db,s.identity,s.input,9999)).unchanged,true);assert.equal(s.writes.length,count);
});
test('staff, inactive memberships and unverified accounts cannot view or submit company requests',async()=>{
 for(const mode of ['staff','inactive','unverified']){
  const s=setup();if(mode==='staff')s.records.get('plataforma_admin/billing/companies/tenant').ownerUid='another-owner';
  if(mode==='inactive')s.records.get('membros/owner').ativo=false;if(mode==='unverified')s.identity.emailVerified=false;
  await assert.rejects(companyContractOverview(s.db,s.identity));await assert.rejects(requestCompanyContract(s.db,s.identity,s.input));assert.equal(s.writes.length,0);
 }
});
test('stale or tampered prices and absent acknowledgement fail before writes',async()=>{
 for(const changes of [{expectedAmountCents:1},{expectedInterval:'monthly'},{revision:0},{simulationOnly:false},{renewalPreference:'daily'},{planId:'other'}]){
  const s=setup();await assert.rejects(requestCompanyContract(s.db,s.identity,{...s.input,...changes}));assert.equal(s.writes.length,0);
 }
 const s=setup();s.records.get('plataforma_admin/billing/plans/yearly').active=false;await assert.rejects(requestCompanyContract(s.db,s.identity,s.input));assert.equal(s.writes.length,0);
});
