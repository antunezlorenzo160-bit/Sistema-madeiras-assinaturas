import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeSharedTrip,allocateTripCosts,TRIP_COSTS,sharedTripDocument} from '../public/shared-trips.mjs';
import {saveSharedTrip,listSharedTrips,sharedTripReport,projectSharedTripExpenses,tripPath,tripLinkPath,tripEntryId} from '../Netlify/Funtions/lib/shared-trips.mjs';
import {confirmStockPurchase} from '../Netlify/Funtions/lib/stock-purchase.mjs';
import {financeCollectionPath,listFinanceEntries,saveFinanceEntry,cancelFinanceEntry} from '../Netlify/Funtions/lib/company-finance.mjs';
import {saveLoadTransport} from '../Netlify/Funtions/lib/load-transport.mjs';
import {aggregateFinance} from '../public/company-finance.mjs';
import {reconcileFinanceSales} from '../public/finance-reconciliation.mjs';
import {purchaseTestDb} from './stock-purchase.test.mjs';
const at=Date.UTC(2026,10,8,12),id='a0359816-48e7-44db-8d0e-9065301b7fa5',range={from:'2026-11-08',to:'2026-11-08'};
const costs=extra=>({...Object.fromEntries(Object.keys(TRIP_COSTS).map(k=>[k,0])),...extra});
const input=extra=>({companyId:'tenant',id,revision:0,date:'2026-11-08',destination:'Cidade comum',truck:'ABC1D23',driver:'Motorista',loadIds:['a','b','c'],costs:costs({fuel:300000}),status:'active',acknowledgeExistingExpenses:false,...extra});
async function fixture(){
 const s=purchaseTestDb();await confirmStockPurchase(s.db,s.identity,{companyId:'tenant',id:'8a58eaf9-6084-4bb0-b68e-062fcf477f4b',date:'2026-11-08',supplier:'Fornecedor',reference:'NF',stock:'estoque1',freightCents:0,otherCents:0,freightIncluded:false,otherIncluded:false,lines:[{id:'b28dedf2-646b-4981-b7ae-0de09b5ed6bd',madeiraId:'wood',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:10,volume:10,estadoMadeira:'seca',unitCents:130000}]},at);
 for(const [path] of s.records)if(path.includes('sm2_estoque1/registros/'))s.records.delete(path);
 for(const [index,[gid,qty,customer]] of [['a',5,'Cliente A'],['b',3,'Cliente B'],['c',2,'Cliente C']].entries()){
  s.records.set(`empresas/tenant/dados/sm2_carregamentos/registros/line-${gid}`,{id:'line-'+gid,grupoCargaId:gid,madeiraId:'wood',madeira:'Garapeira',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:qty,volume:qty,valor:qty*2000,cargaStatus:'concluido',cargaFechadaEm:at+100,cargaBaixadaEm:at+(index+1)*3600000,dadosClienteCargaV407:{nome:customer}});
  s.records.set(`empresas/tenant/dados/sm2_movimentos/registros/out-${gid}`,{id:'out-'+gid,grupoCargaId:gid,madeiraId:'wood',tipoCadastro:'m3',tipo:'saida',largura:100,espessura:100,comprimento:1,quantidade:qty,volume:qty,costRecordedAtV728:at+(index+1)*3600000});
 }
 return s;
}
test('shared allocation closes to the cent for 3 clients, and repeated allocations are independent of input order',()=>{
 const loads=[{loadId:'a',physicalM3:5},{loadId:'b',physicalM3:3},{loadId:'c',physicalM3:2}];assert.deepEqual(allocateTripCosts(300000,loads).map(p=>p.amountCents),[150000,90000,60000]);
 for(const cents of [0,1,2,100,300001]){const parts=allocateTripCosts(cents,loads);assert.equal(parts.reduce((n,p)=>n+p.amountCents,0),cents);assert.deepEqual(parts,allocateTripCosts(cents,[...loads].reverse()));}
 for(const bad of [[],[{loadId:'a',physicalM3:1}],[{loadId:'a',physicalM3:1},{loadId:'a',physicalM3:2}],[{loadId:'a',physicalM3:0},{loadId:'b',physicalM3:1}]])assert.throws(()=>allocateTripCosts(10,bad));assert.throws(()=>normalizeSharedTrip(input({costs:costs({fuel:-1})})));assert.throws(()=>normalizeSharedTrip(input({loadIds:['a','a']})));
});
test('one trip creates one expense, retains all original documents/stock, and feeds per-client and period results',async()=>{
 const s=await fixture(),before=JSON.stringify([...s.records].filter(([p])=>p.includes('/dados/'))),r=await saveSharedTrip(s.db,s.identity,input(),at+4*3600000);
 assert.equal(r.trip.totalCents,300000);assert.equal(r.trip.allocations.length,3);assert.equal(JSON.stringify([...s.records].filter(([p])=>p.includes('/dados/'))),before);
 const writes=s.writes.length;await saveSharedTrip(s.db,s.identity,input(),at+5*3600000);assert.equal(s.writes.length,writes);
 const finance=await listFinanceEntries(s.db,s.identity,range,at+5*3600000),report=aggregateFinance(finance.entries,range),reconciled=reconcileFinanceSales(finance.entries,range);
 assert.equal(report.total.sale,2000000);assert.equal(report.total.cost,1300000);assert.equal(report.total.expense,300000);assert.equal(report.total.result,400000);assert.deepEqual(reconciled.rows.map(r=>r.transportCents).sort((a,b)=>b-a),[150000,90000,60000]);assert.equal(reconciled.otherExpenseCents,0);
 const trip=await sharedTripReport(s.db,s.identity,id,at+5*3600000);assert.equal(trip.total.resultCents,400000);assert.equal(trip.loads.reduce((n,l)=>n+l.resultCents,0),400000);assert.equal(trip.loads.length,3);assert.equal(s.writes.length,writes);
 const listing=await listSharedTrips(s.db,s.identity,range,at+5*3600000);assert.equal(listing.candidates.length,3);assert.equal(listing.trips.length,1);assert(listing.candidates.every(c=>c.tripId===id));
});
test('editing late breakdown costs updates the same expense and cancellation releases membership without undoing sales',async()=>{
 const s=await fixture();await saveSharedTrip(s.db,s.identity,input(),at+4*3600000);const changed=input({revision:1,costs:costs({fuel:300000,maintenance:500000})});await saveSharedTrip(s.db,s.identity,changed,at+5*3600000);
 let result=await listFinanceEntries(s.db,s.identity,range,at+5*3600000);assert.equal(result.entries.filter(e=>e.source?.type==='shared-trip').length,1);assert.equal(aggregateFinance(result.entries,range).total.result,-100000);
 await assert.rejects(saveSharedTrip(s.db,s.identity,input({costs:costs({fuel:900000})}),at+6*3600000),e=>e.status===409);
 await saveSharedTrip(s.db,s.identity,{...changed,revision:2,status:'cancelled'},at+6*3600000);result=await listFinanceEntries(s.db,s.identity,range,at+6*3600000);assert.equal(aggregateFinance(result.entries,range).total.expense,0);assert.equal(result.entries.filter(e=>e.type==='sale').length,3);assert.equal(s.records.get(tripLinkPath('tenant','a')).tripId,null);
});
test('a load cannot be assigned twice, foreign company and non-owner writes are denied, and manual ledger edits cannot bypass trip ownership',async()=>{
 const s=await fixture();await saveSharedTrip(s.db,s.identity,input(),at+4*3600000);let count=s.writes.length;
 await assert.rejects(saveSharedTrip(s.db,s.identity,input({id:'d0359816-48e7-44db-8d0e-9065301b7fa5'}),at+5*3600000),e=>e.status===409);await assert.rejects(saveSharedTrip(s.db,s.identity,input({companyId:'foreign'}),at+5*3600000));
 const entry=s.records.get(financeCollectionPath('tenant')+'/'+tripEntryId(id));await assert.rejects(cancelFinanceEntry(s.db,s.identity,{id:entry.id,revision:entry.revision},at+5*3600000),e=>e.status===409);await assert.rejects(saveFinanceEntry(s.db,s.identity,{id:entry.id,revision:entry.revision,type:'expense',date:entry.date,description:'Mudou',partner:'',reference:'',category:'other',amountCents:1,costCents:null},at+5*3600000),e=>e.status===409);assert.equal(s.writes.length,count);
 s.records.get('empresas/tenant').ownerUid='other';await assert.rejects(saveSharedTrip(s.db,s.identity,input({revision:1}),at+5*3600000),e=>e.status===403);
});
test('exclusive transport costs require explicit acknowledgement and are never replaced by the shared expense',async()=>{
 const s=await fixture();await saveLoadTransport(s.db,s.identity,{loadId:'b',revision:0,mode:'own',date:'2026-11-08',costs:{carrier:0,fuel:10000,tolls:0,driver:0,maintenance:0,other:0}},at+4*3600000);
 await assert.rejects(saveSharedTrip(s.db,s.identity,input(),at+4*3600000),e=>e.status===409);await saveSharedTrip(s.db,s.identity,input({acknowledgeExistingExpenses:true}),at+4*3600000);
 const finance=await listFinanceEntries(s.db,s.identity,range,at+5*3600000),rows=reconcileFinanceSales(finance.entries,range);assert.equal(rows.rows.find(r=>r.loadId==='b').transportCents,100000);assert.equal(rows.resultCents,390000);assert.equal(rows.otherExpenseCents,0);
});
test('rateio reprojects changed physical volumes without a new expense; costs outside a sale period remain accounted once',async()=>{
 const s=await fixture();await saveSharedTrip(s.db,s.identity,input(),at+4*3600000);const entry=s.records.get(financeCollectionPath('tenant')+'/'+tripEntryId(id)),line=s.records.get('empresas/tenant/dados/sm2_carregamentos/registros/line-a');line.quantidade=10;line.volume=10;const count=s.writes.length;
 const projected=await projectSharedTripExpenses(s.db,'tenant',[entry]);assert.deepEqual(projected[0].source.allocations.map(a=>a.amountCents),[200000,60000,40000]);assert.equal(s.writes.length,count);
 const sale={id:'sale-a',type:'sale',date:'2026-11-08',amountCents:1000000,costCents:650000,status:'active',source:{type:'load-sale',loadId:'a'}},reconciled=reconcileFinanceSales([sale,entry],range);assert.equal(reconciled.rows[0].transportCents,150000);assert.equal(reconciled.otherExpenseCents,150000);assert.equal(reconciled.resultCents,50000);
});
test('shared document escapes customer data, preserves client grouping and never prints private purchase cost',()=>{
 const html=sharedTripDocument({trip:{date:'2026-11-08',destination:'<script>bad</script>',truck:'ABC',driver:'Fulano'},loads:[{customer:'<img onerror=bad>',physicalM3:1,items:[{madeira:'Garapeira',quantidade:1,espessura:10,largura:10,comprimento:1,physicalM3:1}],costCents:123456}]});assert(!html.includes('<script>'));assert(!html.includes('<img'));assert(html.includes('&lt;img'));assert(!html.includes('123456'));assert(html.includes('Romaneio geral'));
});
test('missing members can still be reviewed and the trip cancelled; a membership swap is rechecked in the transaction',async()=>{
 const s=await fixture();await saveSharedTrip(s.db,s.identity,input(),at+4*3600000);s.records.delete('empresas/tenant/dados/sm2_carregamentos/registros/line-a');const report=await sharedTripReport(s.db,s.identity,id,at+5*3600000);assert.equal(report.needsReview,true);assert.equal(report.total.resultCents,null);
 await saveSharedTrip(s.db,s.identity,input({revision:1,status:'cancelled'}),at+5*3600000);assert.equal(s.records.get(tripLinkPath('tenant','a')).tripId,null);
 const other=await fixture(),count=other.writes.length;other.db.beforeTransaction=()=>{other.records.get('membros/owner').empresaId='other';other.records.set('empresas/other',{ownerUid:'owner'});};await assert.rejects(saveSharedTrip(other.db,other.identity,input(),at+4*3600000),e=>e.status===409);assert.equal(other.writes.length,count);
});
test('zero shared cost can be edited into a real expense and removing a client releases its link',async()=>{
 const s=await fixture();await saveSharedTrip(s.db,s.identity,input({costs:costs({})}),at+4*3600000);let entries=(await listFinanceEntries(s.db,s.identity,range,at+5*3600000)).entries;assert.equal(aggregateFinance(entries,range).total.expense,0);
 await saveSharedTrip(s.db,s.identity,input({revision:1,loadIds:['a','b'],costs:costs({fuel:10000})}),at+5*3600000);assert.equal(s.records.get(tripLinkPath('tenant','c')).tripId,null);entries=(await listFinanceEntries(s.db,s.identity,range,at+5*3600000)).entries;assert.equal(entries.filter(e=>e.source?.type==='shared-trip').length,1);assert.equal(aggregateFinance(entries,range).total.expense,10000);
});
test('different wood species in one client order retain their own purchase costs and contribute to one physical-volume share',async()=>{
 const s=await fixture();s.records.set('empresas/tenant/dados/sm2_madeiras/registros/pine',{nome:'Pinus',tipoCadastro:'m3',preco:3000});
 const extra=await confirmStockPurchase(s.db,s.identity,{companyId:'tenant',id:'9a58eaf9-6084-4bb0-b68e-062fcf477f4b',date:'2026-11-08',supplier:'Fornecedor',reference:'Pinus',stock:'estoque1',freightCents:0,otherCents:0,freightIncluded:false,otherIncluded:false,lines:[{id:'c28dedf2-646b-4981-b7ae-0de09b5ed6bd',madeiraId:'pine',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1,estadoMadeira:'seca',unitCents:200000}]},at+100);s.records.delete('empresas/tenant/dados/sm2_estoque1/registros/'+extra.receipt.lines[0].stockId);
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/pine-out',{id:'pine-out',madeiraId:'pine',tipoCadastro:'m3',tipo:'saida',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1,grupoCargaId:'a',costRecordedAtV728:at+3600100});
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/pine-line',{id:'pine-line',madeiraId:'pine',madeira:'Pinus',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1,valor:3000,grupoCargaId:'a',cargaStatus:'concluido',cargaFechadaEm:at+100,cargaBaixadaEm:at+3600100,dadosClienteCargaV407:{nome:'Cliente A'}});
 await saveSharedTrip(s.db,s.identity,input(),at+4*3600000);const report=await sharedTripReport(s.db,s.identity,id,at+5*3600000),client=report.loads.find(l=>l.loadId==='a');assert.equal(client.physicalM3,6);assert.equal(client.costCents,850000);assert.equal(client.amountCents,1300000);assert.equal(client.items.length,2);assert.equal(report.total.resultCents,500000);assert.equal(report.loads.reduce((n,l)=>n+l.sharedCents,0),300000);assert(sharedTripDocument(report).includes('Pinus'));
});
