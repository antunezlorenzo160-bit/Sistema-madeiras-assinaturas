import test from 'node:test';import assert from 'node:assert/strict';
import {periodEnd,createTestPeriod,periodView,assertCheckoutPeriodAvailable,periodFromApprovedCharge,startRequestedTestPeriod} from '../Netlify/Funtions/lib/contract-periods.mjs';
const at=value=>Date.parse(value),terms={planId:'annual',planName:'Completo Anual',amountCents:200000,interval:'yearly'};
test('annual price remains locked after catalog adjustment; the new price is shown only for renewal',()=>{
 const start=at('2026-10-28T10:00:00-03:00'),period=createTestPeriod(terms,start),newPlan={name:'Anual',amountCents:250000,interval:'yearly',active:true};
 assert.equal(period.endsAt,at('2027-10-28T10:00:00-03:00'));
 const tomorrow=periodView(period,newPlan,start+86400000);assert.equal(tomorrow.amountCents,200000);assert.equal(tomorrow.nextTerms,null);assert.equal(tomorrow.priceChanged,false);assert.equal(tomorrow.renewalOpen,false);
 const notice=periodView(period,newPlan,period.renewalNoticeAt);assert.equal(notice.amountCents,200000);assert.equal(notice.nextTerms.amountCents,250000);assert.equal(notice.priceChanged,true);assert.equal(notice.active,true);
 const expired=periodView(period,newPlan,period.endsAt);assert.equal(expired.active,false);assert.equal(expired.expired,true);assert.equal(expired.nextTerms.amountCents,250000);
});
test('calendar periods clamp month ends and leap days in Brasilia time, including late evening',()=>{
 assert.equal(periodEnd(at('2027-01-31T23:30:00-03:00'),'monthly'),at('2027-02-28T23:30:00-03:00'));
 assert.equal(periodEnd(at('2027-02-28T23:30:00-03:00'),'monthly'),at('2027-03-28T23:30:00-03:00'));
 assert.equal(periodEnd(at('2028-02-29T10:00:00-03:00'),'yearly'),at('2029-02-28T10:00:00-03:00'));
 const p=createTestPeriod({...terms,interval:'monthly'},at('2026-10-28T10:00:00-03:00'));assert.equal(p.endsAt-p.renewalNoticeAt,7*86400000);
});
test('test payments cannot replace an active period or extend it on duplicate and out-of-order payments',()=>{
 const now=at('2026-10-28T10:00:00-03:00'),period=createTestPeriod(terms,now),charge={...terms,empresaId:'company',contractPeriodVersion:1,previousPeriodId:null};
 assert.throws(()=>assertCheckoutPeriodAvailable(period,now+1),/vigente/);
 assert.equal(periodFromApprovedCharge(charge,{id:1},period,now+1),null);
 assert.equal(periodFromApprovedCharge(charge,{id:1},period,period.endsAt+1),null);
 const renewal=periodFromApprovedCharge({...charge,previousPeriodId:period.id,amountCents:250000},{id:2,date_approved:new Date(period.endsAt).toISOString()},period,period.endsAt+1000);
 assert.equal(renewal.amountCents,250000);assert.equal(renewal.startsAt,period.endsAt);assert.equal(renewal.endsAt,at('2028-10-28T10:00:00-03:00'));
 assert.equal(periodFromApprovedCharge({...charge,contractPeriodVersion:undefined},{id:3},null,now),null);
});
function setup(){
 const root='plataforma_admin/billing',records=new Map([[`${root}/companies/company`,{name:'Empresa'}],[`${root}/contract_requests/company`,{...terms,empresaId:'company',simulationOnly:true,status:'requested_test',requestedAt:100}]]),writes=[];
 const db={doc:path=>({path,id:path.split('/').at(-1)}),runTransaction:async fn=>{
  let writing=false;return fn({get:async ref=>{assert(!writing);return {exists:records.has(ref.path),data:()=>records.get(ref.path)};},set:(ref,data)=>{writing=true;records.set(ref.path,data);writes.push(ref.path);},create:(ref,data)=>{writing=true;records.set(ref.path,data);writes.push(ref.path);}});
 }};return {db,records,writes,input:{empresaId:'company',expectedRequestedAt:100}};
}
test('starting a simulated period is idempotent and does not alter subscriptions or memberships',async()=>{
 const s=setup(),now=at('2026-10-28T10:00:00-03:00'),r=await startRequestedTestPeriod(s.db,s.input,'owner',now);
 assert.equal(r.period.amountCents,200000);assert.equal(r.period.automaticBilling,false);assert.equal(r.period.mode,'test');const count=s.writes.length;
 assert.equal((await startRequestedTestPeriod(s.db,s.input,'owner',now+1)).unchanged,true);assert.equal(s.writes.length,count);
 assert(s.writes.every(p=>p.includes('/test_contract_periods/')||p.includes('/audit/events/')));
 s.records.get('plataforma_admin/billing/contract_requests/company').requestedAt=200;
 await assert.rejects(startRequestedTestPeriod(s.db,{...s.input,expectedRequestedAt:200},'owner',now+1),/vigente/);
});
