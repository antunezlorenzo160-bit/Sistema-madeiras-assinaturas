import test from 'node:test';import assert from 'node:assert/strict';
import {savePlan} from '../Netlify/Funtions/lib/plans.mjs';
function setup(){
 const path='plataforma_admin/billing/plans/monthly',records=new Map([[path,{name:'Mensal',amountCents:19990,interval:'monthly',updatedAt:10,active:true,custom:'preserved'}],['plataforma_admin/billing/charges/paid',{amountCents:19990,status:'test_payment_approved'}]]),writes=[];
 const db={doc:path=>({path,id:path.split('/').at(-1)}),runTransaction:async fn=>fn({get:async ref=>{const data=structuredClone(records.get(ref.path));return {exists:!!data,data:()=>data};},set:(ref,data)=>{writes.push(ref.path);records.set(ref.path,{...records.get(ref.path),...data});},create:(ref,data)=>{writes.push(ref.path);records.set(ref.path,data);}})};
 return {db,records,writes,path,input:{id:'monthly',expectedRevision:10,name:'Mensal',amountCents:21990,interval:'monthly'}};
}
test('price adjustment preserves the existing plan id and already issued payment values',async()=>{
 const s=setup(),r=await savePlan(s.db,s.input,'owner',20);assert.equal(r.id,'monthly');assert.equal(s.records.get(s.path).amountCents,21990);assert.equal(s.records.get(s.path).custom,'preserved');assert.equal(s.records.get('plataforma_admin/billing/charges/paid').amountCents,19990);
 assert.equal(s.writes.filter(p=>p.includes('/plans/')).length,1);const audit=[...s.records.values()].find(d=>d.action==='plan.update');assert.equal(audit.previous.amountCents,19990);assert.equal(audit.next.amountCents,21990);
});
test('stale editors, removed plans and invalid values cannot overwrite the catalog',async()=>{
 for(const change of [{expectedRevision:9},{id:'missing'},{amountCents:-1}]){const s=setup();await assert.rejects(savePlan(s.db,{...s.input,...change},'owner'));assert.equal(s.writes.length,0);}
});
test('editing an inactive plan does not silently reactivate it',async()=>{const s=setup();s.records.get(s.path).active=false;await savePlan(s.db,s.input,'owner',20);assert.equal(s.records.get(s.path).active,false);});

test('renaming current plans is atomic, preserves adjusted prices and ids, and never creates SM PRO',async()=>{
 const {renameCurrentPlansToSM}=await import('../Netlify/Funtions/lib/plans.mjs');
 const root='plataforma_admin/billing/plans',records=new Map([[root+'/monthly',{name:'Sistema de Madeiras — Completo',amountCents:0,interval:'monthly',active:true,updatedAt:1}],[root+'/annual',{name:'Sistema de Madeiras — Completo Anual',amountCents:250000,interval:'yearly',active:true,updatedAt:2}],[root+'/pro',{name:'SM PRO',amountCents:500000,interval:'yearly',active:true}],[root+'/archived',{name:'Sistema',amountCents:100,interval:'monthly',active:false}]]),writes=[];
 const db={doc:path=>({path}),collection:path=>({limit:()=>({path})}),runTransaction:async fn=>{
  let writing=false;return fn({get:async query=>{assert(!writing);const docs=[...records.keys()].filter(p=>p.startsWith(query.path+'/')).map(path=>{const data=structuredClone(records.get(path));return {id:path.split('/').at(-1),ref:{path},data:()=>data};});return {docs,size:docs.length};},set:(ref,data)=>{writing=true;writes.push(ref.path);records.set(ref.path,{...records.get(ref.path),...data});},create:(ref,data)=>{writing=true;writes.push(ref.path);records.set(ref.path,data);}});
 }};
 assert.equal((await renameCurrentPlansToSM(db,'owner',10)).renamed,2);
 assert.equal(records.get(root+'/monthly').name,'SM');assert.equal(records.get(root+'/monthly').amountCents,0);
 assert.equal(records.get(root+'/annual').name,'SM');assert.equal(records.get(root+'/annual').amountCents,250000);assert.equal(records.get(root+'/annual').interval,'yearly');
 assert.equal(records.get(root+'/pro').name,'SM PRO');assert.equal(records.get(root+'/archived').name,'Sistema');
 const before=writes.length;assert.equal((await renameCurrentPlansToSM(db,'owner',20)).renamed,0);assert.equal(writes.length,before);
});

function deletionSetup(referenceCollection){
 const path='plataforma_admin/billing/plans/accidental',records=new Map([[path,{name:'Sistema completo 0.00',amountCents:0,interval:'yearly',updatedAt:7}],['plataforma_admin/billing/plans/keep',{name:'SM',amountCents:0,interval:'yearly'}]]),writes=[];
 const db={doc:path=>({path}),collection:path=>({where:(key,op,value)=>({limit:()=>({query:true,path,value})})}),runTransaction:async fn=>{
  let writing=false;return fn({get:async ref=>{assert(!writing);if(ref.query)return {size:ref.path.endsWith('/'+referenceCollection)?1:0};const data=structuredClone(records.get(ref.path));return {exists:!!data,data:()=>data};},delete:ref=>{writing=true;records.delete(ref.path);writes.push(ref.path);},create:(ref,data)=>{writing=true;records.set(ref.path,data);writes.push(ref.path);}});
 }};return {db,records,writes,path,input:{planId:'accidental',expectedRevision:7}};
}
test('an individually selected unused plan can be deleted without affecting SM or prices',async()=>{
 const {deleteUnusedPlan}=await import('../Netlify/Funtions/lib/plans.mjs'),s=deletionSetup();await deleteUnusedPlan(s.db,s.input,'owner');assert.equal(s.records.has(s.path),false);assert.equal(s.records.get('plataforma_admin/billing/plans/keep').name,'SM');assert.equal(s.writes.length,2);
 const before=s.writes.length;assert.equal((await deleteUnusedPlan(s.db,s.input,'owner')).alreadyDeleted,true);assert.equal(s.writes.length,before);
});
test('subscriptions, payments, requests and guaranteed periods each prevent deletion',async()=>{
 const {deleteUnusedPlan}=await import('../Netlify/Funtions/lib/plans.mjs');
 for(const collection of ['subscriptions','charges','contract_requests','test_contract_periods']){const s=deletionSetup(collection);await assert.rejects(deleteUnusedPlan(s.db,s.input,'owner'),/não foi excluído/);assert.equal(s.records.has(s.path),true);assert.equal(s.writes.length,0);}
 const s=deletionSetup();await assert.rejects(deleteUnusedPlan(s.db,{...s.input,expectedRevision:6},'owner'),/mudou/);assert.equal(s.writes.length,0);
});
