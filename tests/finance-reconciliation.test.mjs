import test from 'node:test';import assert from 'node:assert/strict';
import {reconcileFinanceSales} from '../public/finance-reconciliation.mjs';
import {loadPhysicalM3} from '../public/load-sales.mjs';
const range={from:'2026-11-01',to:'2026-11-30'},sale=(id,amountCents,costCents,extra={})=>({id,type:'sale',status:'active',date:'2026-11-08',description:'Venda',partner:'Cliente',amountCents,costCents,source:{type:'load-sale',loadId:id,physicalM3:10,costMode:'manual',automaticCostCents:1000000},...extra}),expense=(id,amountCents,loadId=null,extra={})=>({id,type:'expense',status:'active',date:'2026-11-08',amountCents,costCents:null,...(loadId?{source:{type:'load-transport',loadId}}:{}),...extra});
test('each sale explains R14330 of manual totals and reconciles period expenses without changing the records',()=>{
 const entries=[sale('a',2022367,1300000,{source:{type:'load-sale',loadId:'a',physicalM3:10,costMode:'manual',automaticCostCents:1300000}}),sale('b',2595250,130000),sale('c',2500000,3000),expense('ta',48000,'a'),expense('tb',155000,'b'),expense('tc',177000,'c'),expense('general',20000)],before=JSON.stringify(entries),report=reconcileFinanceSales(entries,range);
 assert.equal(report.costTotalCents,1433000);assert.equal(report.resultCents,5284617);assert.equal(report.otherExpenseCents,20000);assert.deepEqual(report.rows.map(r=>r.costCents),[1300000,130000,3000]);assert.deepEqual(report.rows.map(r=>r.unitEquivalentCents),[130000,13000,300]);assert.equal(report.manualDifferenceCount,2);assert.equal(JSON.stringify(entries),before);
 assert.equal(report.rows.reduce((n,r)=>n+r.netCents,0)-report.otherExpenseCents,report.resultCents);
});
test('charged freight is already sale revenue, actual delivery is subtracted once and purchase is kept in stock accounting',()=>{
 const entries=[sale('a',2550000,1300000,{source:{type:'load-sale',loadId:'a',costMode:'average',physicalM3:10,automaticCostCents:1300000,freightCents:50000}}),expense('delivery',30000,'a'),{id:'purchase',type:'purchase',status:'active',date:'2026-11-08',amountCents:2159425,costCents:null}],report=reconcileFinanceSales(entries,range);assert.equal(report.rows[0].billedFreightCents,50000);assert.equal(report.rows[0].transportCents,30000);assert.equal(report.resultCents,1220000);assert.equal(report.manualDifferenceCount,0);assert.equal(report.rows.length,1);
});
test('expenses of another date or another load are not silently assigned to a sale',()=>{
 const report=reconcileFinanceSales([sale('a',200000,100000),expense('last-month',10000,'a',{date:'2026-10-31'}),expense('other-load',20000,'another'),expense('general',5000)],range);assert.equal(report.rows[0].transportCents,0);assert.equal(report.rows[0].netCents,100000);assert.equal(report.otherExpenseCents,25000);assert.equal(report.resultCents,75000);
});
test('unknown cost and duplicate review stay pending, canceled sales are omitted and material loss is subtracted once',()=>{
 let report=reconcileFinanceSales([sale('missing',200000,null),sale('cancelled',500000,10000,{status:'cancelled'})],range);assert.equal(report.rows.length,1);assert.equal(report.rows[0].netCents,null);assert.equal(report.resultCents,null);assert.equal(report.pendingCosts,1);
 report=reconcileFinanceSales([sale('review',200000,100000,{status:'pending-review'}),sale('normal',200000,100000),{id:'loss',type:'loss',status:'active',date:'2026-11-08',amountCents:5000,costCents:null}],range);assert.equal(report.pendingReviews.length,1);assert.equal(report.rows.length,1);assert.equal(report.resultCents,null);
 report=reconcileFinanceSales([sale('normal',200000,100000),{id:'loss',type:'loss',status:'active',date:'2026-11-08',amountCents:5000,costCents:null}],range);assert.equal(report.resultCents,95000);
});
test('physical volume is not guessed from mixed units or selling prices',()=>{
 assert.equal(loadPhysicalM3([{tipoMedida:'m3',largura:10,espessura:5,comprimento:5,quantidade:40,volume:99}]),1);assert.equal(loadPhysicalM3([{tipoMedida:'m2',volume:10}]),null);assert.equal(loadPhysicalM3([{tipoMedida:'m3',volume:10}]),null);
 assert.throws(()=>reconcileFinanceSales([sale('duplicate',10000,100),sale('duplicate',20000,200)],range),/duas vendas/);
});
