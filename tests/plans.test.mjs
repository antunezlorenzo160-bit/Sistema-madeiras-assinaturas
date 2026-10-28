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
