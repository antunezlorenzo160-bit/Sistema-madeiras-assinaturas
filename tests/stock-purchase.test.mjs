import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeStockPurchase,stockCostKey,groupStockPurchaseLinesV754,purchasePacketCountV755} from '../public/stock-purchase.mjs';
import {confirmStockPurchase,purchaseRecordsPath,purchaseRecordId} from '../Netlify/Funtions/lib/stock-purchase.mjs';
import {financeCollectionPath,saveFinanceEntry,cancelFinanceEntry} from '../Netlify/Funtions/lib/company-finance.mjs';
import {projectLoadSales,saveLoadSaleConfig} from '../Netlify/Funtions/lib/load-sales.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../public/billing-access.mjs';
const id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b',lineId='b28dedf2-646b-4981-b7ae-0de09b5ed6bd',at=Date.UTC(2026,10,8,12);
const line=(extra={})=>({id:lineId,madeiraId:'wood',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:2,volume:2,estadoMadeira:'seca',unitCents:100000,...extra});
const purchase=(extra={})=>({companyId:'tenant',id,date:'2026-11-08',supplier:'Fornecedor',reference:'Nota 1',stock:'estoque1',freightCents:20000,otherCents:10000,freightIncluded:false,otherIncluded:false,lines:[line()],...extra});
export function purchaseTestDb(){
 const records=new Map([['membros/owner',{ativo:true,papel:'admin',empresaId:'tenant'}],['empresas/tenant',{ownerUid:'owner'}],['empresas/tenant/dados/sm2_madeiras/registros/wood',{nome:'Garapeira',tipoCadastro:'m3',preco:3000}]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const query=(path,filters=[],max=Infinity)=>({query:true,where:(k,op,v)=>query(path,[...filters,[k,op,v]],max),limit:n=>query(path,filters,n),orderBy:()=>query(path,filters,max),get:async()=>({docs:[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>op==='=='?records.get(p)[k]===v:op==='in'?v.includes(records.get(p)[k]):op==='>='?records.get(p)[k]>=v:records.get(p)[k]<=v)).slice(0,max).map(snap)})});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>query(path),async runTransaction(fn){db.beforeTransaction?.();let writing=false;const pending=[];const result=await fn({get:async ref=>{assert(!writing,'all reads precede writes');return ref.query?ref.get():snap(ref.path);},create:(ref,value)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,value]);},set:(ref,value)=>{writing=true;pending.push([ref.path,value]);}});for(const [path,value] of pending){records.set(path,structuredClone(value));writes.push(path);}return result;}};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true}};
}
test('purchase totals allocate acquisition expenses once, already-included fees are never added again',()=>{
 const r=normalizeStockPurchase(purchase());assert.equal(r.totalCents,230000);assert.equal(r.lines[0].acquisitionCents,230000);
 assert.equal(normalizeStockPurchase(purchase({freightIncluded:true,otherIncluded:true})).totalCents,200000);
 const result=normalizeStockPurchase(purchase({lines:[line({quantidade:1,volume:1,unitCents:1}),line({id:'a2d00244-a75c-44a4-aa30-bd78176a744d',quantidade:2,volume:2,unitCents:1})],freightCents:1,otherCents:0}));assert.equal(result.lines.reduce((sum,i)=>sum+i.acquisitionCents,0),4);
 for(const input of [purchase({empresaId:'foreign'}),purchase({lines:[line({volume:99})]}),purchase({lines:[line({quantidade:1.5,volume:1.5})]}),purchase({lines:[line({unitCents:0})]}),purchase({lines:[line(),line()]}),purchase({date:'2026-02-30'})])assert.throws(()=>normalizeStockPurchase(input));
});
test('confirmation creates stock, history and one private financial purchase atomically; retry is idempotent',async()=>{
 const s=purchaseTestDb(),input=purchase(),before=JSON.stringify(input),result=await confirmStockPurchase(s.db,s.identity,input,at),receipt=result.receipt;
 assert.equal(receipt.totalCents,230000);assert.equal(receipt.revision,1);assert.equal(s.records.get(financeCollectionPath('tenant')+'/'+receipt.entryId).amountCents,230000);
 const stock=s.records.get('empresas/tenant/dados/sm2_estoque1/registros/'+receipt.lines[0].stockId),movement=s.records.get('empresas/tenant/dados/sm2_movimentos/registros/'+receipt.lines[0].movementId);
 assert.equal(stock.volume,2);assert.equal(stock.madeira,'Garapeira');assert.equal(stock.preco,0);assert.equal(stock.unitCents,undefined);assert.equal(stock.acquisitionCents,undefined);assert.equal(movement.tipo,'entrada');assert.equal(movement.purchaseReceiptV728,id);assert.equal(receipt.lines[0].costKey,stockCostKey(stock));
 const count=s.writes.length,again=await confirmStockPurchase(s.db,s.identity,input,at+100);assert(again.repeated);assert.equal(s.writes.length,count);assert.equal(JSON.stringify(input),before);
 await assert.rejects(confirmStockPurchase(s.db,s.identity,purchase({freightCents:1}),at+200),e=>e.status===409);assert.equal(s.writes.length,count);
 assert.equal(s.records.get('empresas/tenant/dados/sm2_madeiras/registros/wood').preco,3000);
});
test('invalid catalog, foreign tenant, employees, email, plan and tenant swap reject before any writes',async()=>{
 for(const mode of ['missing','unit','employee','unverified','plan','swap','foreign-screen']){
  const s=purchaseTestDb();if(mode==='missing')s.records.delete('empresas/tenant/dados/sm2_madeiras/registros/wood');if(mode==='unit')s.records.get('empresas/tenant/dados/sm2_madeiras/registros/wood').tipoCadastro='linear';if(mode==='employee')s.records.get('empresas/tenant').ownerUid='other';if(mode==='unverified')s.identity.emailVerified=false;if(mode==='plan')s.records.set('empresas/tenant/acesso/plano',billingAccessWindow(at-6*BILLING_ACCESS_DAY));if(mode==='swap')s.db.beforeTransaction=()=>{s.records.get('membros/owner').empresaId='other';s.records.set('empresas/other',{ownerUid:'owner'});};
  await assert.rejects(confirmStockPurchase(s.db,s.identity,purchase(mode==='foreign-screen'?{companyId:'foreign'}:{}),at));assert.equal(s.writes.length,0);
 }
 const s=purchaseTestDb();await assert.rejects(confirmStockPurchase(s.db,s.identity,purchase({lines:[line(),line({id:'a2d00244-a75c-44a4-aa30-bd78176a744d',madeiraId:'not-found'})]}),at));assert.equal(s.writes.length,0);
});
test('source purchase cannot be canceled or edited as an unrelated manual ledger entry',async()=>{
 const s=purchaseTestDb(),{receipt}=await confirmStockPurchase(s.db,s.identity,purchase(),at),entryId=receipt.entryId,count=s.writes.length;
 await assert.rejects(cancelFinanceEntry(s.db,s.identity,{id:entryId,revision:1},at),e=>e.status===409);
 await assert.rejects(saveFinanceEntry(s.db,s.identity,{id:entryId,revision:1,type:'purchase',date:'2026-11-08',description:'Alterada',partner:'',reference:'',category:'wood',amountCents:1,costCents:null},at),e=>e.status===409);assert.equal(s.writes.length,count);
 assert(purchaseRecordsPath('tenant').includes('financeiroPreviaRegistros'));
});
test('a completed stock exit gets average purchase cost automatically; manual confirmed cost still wins',async()=>{
 const s=purchaseTestDb(),{receipt}=await confirmStockPurchase(s.db,s.identity,purchase(),at),p=receipt.lines[0],stockPath='empresas/tenant/dados/sm2_estoque1/registros/'+p.stockId;
 s.records.set(stockPath,{...s.records.get(stockPath),quantidade:1,volume:1});
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/out',{id:'out',madeiraId:'wood',tipoCadastro:'m3',tipo:'saida',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1,origem:'Estoque 1',grupoCargaId:'load',data:'08/11/2026, 10:00:00',atualizadoEm:at+3600000});
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/load-line',{id:'load-line',madeiraId:'wood',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1,valor:3000,cargaStatus:'concluido',cargaBaixadaEm:at+3600000,grupoCargaId:'load'});
 const range={from:'2026-11-08',to:'2026-11-08'};let sale=(await projectLoadSales(s.db,'tenant',range))[0];assert.equal(sale.costCents,115000);assert.equal(sale.source.costMode,'average');assert.equal(sale.amountCents,300000);
 const config={loadId:'load',revision:0,signature:sale.source.signature,include:true,costCents:100000,manualEntry:null,resolution:'none'};
 await saveLoadSaleConfig(s.db,s.identity,config,at+3600000);sale=(await projectLoadSales(s.db,'tenant',range))[0];assert.equal(sale.costCents,100000);assert.equal(sale.source.automaticCostCents,115000);assert.equal(sale.source.costMode,'manual');
 await saveLoadSaleConfig(s.db,s.identity,{...config,revision:1,costCents:null},at+3600001);sale=(await projectLoadSales(s.db,'tenant',range))[0];assert.equal(sale.costCents,115000);assert.equal(sale.source.costMode,'average');
});
test('retry after the purchased stock was consumed never recreates it or changes the ledger',async()=>{
 const s=purchaseTestDb(),first=await confirmStockPurchase(s.db,s.identity,purchase(),at),path='empresas/tenant/dados/sm2_estoque1/registros/'+first.receipt.lines[0].stockId;s.records.delete(path);const before=s.writes.length;
 const again=await confirmStockPurchase(s.db,s.identity,purchase(),at+100);assert(again.repeated);assert.equal(s.writes.length,before);assert(!s.records.has(path));
});
test('a large unloading stays within one atomic confirmation and the Firestore write limit',async()=>{
 const {randomUUID}=await import('node:crypto'),s=purchaseTestDb(),lines=Array.from({length:200},()=>line({id:randomUUID(),quantidade:1,volume:1}));
 const result=await confirmStockPurchase(s.db,s.identity,purchase({lines}),at);assert.equal(result.receipt.lines.length,200);assert.equal(s.writes.length,403);assert.equal(result.receipt.totalCents,20030000);
 assert.throws(()=>normalizeStockPurchase(purchase({lines:[...lines,line({id:randomUUID()})]})));
});
test('old stock receives the authorized R1000 cost without creating another financial purchase',async()=>{
 const {saveOpeningStockCost}=await import('../Netlify/Funtions/lib/opening-stock-cost.mjs'),{listFinanceEntries}=await import('../Netlify/Funtions/lib/company-finance.mjs'),s=purchaseTestDb();
 const physical={madeiraId:'wood',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1};
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/old',{...physical,tipo:'entrada',data:'08/11/2026, 08:00:00'});
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/out',{...physical,tipo:'saida',grupoCargaId:'old-load',data:'08/11/2026, 10:00:00'});
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/old-load',{...physical,grupoCargaId:'old-load',valor:3000,cargaStatus:'concluido',cargaBaixadaEm:at+3600000});
 const range={from:'2026-11-08',to:'2026-11-08'};let report=await listFinanceEntries(s.db,s.identity,range,at+7200000);assert.equal(report.entries[0].costCents,null);
 await saveOpeningStockCost(s.db,s.identity,{companyId:'tenant',unitCents:100000,revision:0},at+7200000);const count=s.writes.length;report=await listFinanceEntries(s.db,s.identity,range,at+7200001);assert.equal(report.entries.length,1);assert.equal(report.entries[0].type,'sale');assert.equal(report.entries[0].costCents,100000);assert.equal(report.entries[0].source.costMode,'average');assert.equal(s.writes.length,count);
 let sale=report.entries[0];await saveLoadSaleConfig(s.db,s.identity,{loadId:'old-load',revision:0,signature:sale.source.signature,include:true,costCents:130000,manualEntry:null,resolution:'none'},at+7200002);
 await saveOpeningStockCost(s.db,s.identity,{companyId:'tenant',unitCents:120000,revision:1},at+7200003);sale=(await listFinanceEntries(s.db,s.identity,range,at+7200004)).entries[0];assert.equal(sale.costCents,130000);assert.equal(sale.source.costMode,'manual');assert.equal(sale.source.automaticCostCents,120000);
});
test('saving old cost once also values old stock whose first exit is recorded later, with no resave or ledger duplication',async()=>{
 const {saveOpeningStockCost}=await import('../Netlify/Funtions/lib/opening-stock-cost.mjs'),{listFinanceEntries}=await import('../Netlify/Funtions/lib/company-finance.mjs'),s=purchaseTestDb(),physical={madeiraId:'wood',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:1,volume:1};
 await saveOpeningStockCost(s.db,s.identity,{companyId:'tenant',unitCents:100000,revision:0},at);
 s.records.set('empresas/tenant/dados/sm2_estoque1/registros/prehistory',{...physical,id:'prehistory'});
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/later-out',{...physical,tipo:'saida',grupoCargaId:'later-load',data:'08/11/2026, 10:00:00'});
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/later-load',{...physical,grupoCargaId:'later-load',valor:2500,cargaStatus:'concluido',cargaBaixadaEm:at+3600000});
 const before=JSON.stringify([...s.records]),writes=s.writes.length,report=await listFinanceEntries(s.db,s.identity,{from:'2026-11-08',to:'2026-11-08'},at+7200000);assert.equal(report.entries.length,1);assert.equal(report.entries[0].costCents,100000);assert.equal(report.entries[0].source.costMode,'average');assert.equal(report.openingPolicy.revision,1);assert.equal(s.writes.length,writes);assert.equal(JSON.stringify([...s.records]),before);
});

test('10 m3 bought at 1300 automatically supplies the cost of a 4 m3 sale without manual entry',async()=>{
 const s=purchaseTestDb(),{receipt}=await confirmStockPurchase(s.db,s.identity,purchase({freightCents:0,otherCents:0,lines:[line({quantidade:10,volume:10,unitCents:130000})]}),at),p=receipt.lines[0];
 assert.equal(receipt.totalCents,1300000);
 s.records.set('empresas/tenant/dados/sm2_estoque1/registros/'+p.stockId,{...s.records.get('empresas/tenant/dados/sm2_estoque1/registros/'+p.stockId),quantidade:6,volume:6});
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/out',{id:'out',madeiraId:'wood',tipoCadastro:'m3',tipo:'saida',largura:100,espessura:100,comprimento:1,quantidade:4,volume:4,origem:'Estoque 1',grupoCargaId:'load',data:'08/11/2026, 10:00:00',atualizadoEm:at+3600000});
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/load-line',{id:'load-line',madeiraId:'wood',tipoMedida:'m3',largura:100,espessura:100,comprimento:1,quantidade:4,volume:4,valor:8000,cargaStatus:'concluido',cargaBaixadaEm:at+3600000,grupoCargaId:'load'});
 const writes=s.writes.length,sale=(await projectLoadSales(s.db,'tenant',{from:'2026-11-08',to:'2026-11-08'}))[0];
 assert.equal(sale.amountCents,800000);assert.equal(sale.costCents,520000);assert.equal(sale.source.physicalM3,4);assert.equal(sale.source.costMode,'average');assert.equal(sale.amountCents-sale.costCents,280000);assert.equal(s.writes.length,writes);
});

test('purchase cost reaches a load after an explicit stock conference, with no extra purchase ledger entry',async()=>{
 const s=purchaseTestDb(),{receipt}=await confirmStockPurchase(s.db,s.identity,purchase({freightCents:0,otherCents:0,lines:[line({quantidade:10,volume:10,unitCents:130000})]}),at),p=receipt.lines[0],path='empresas/tenant/dados/sm2_estoque1/registros/'+p.stockId;
 s.records.set(path,{...s.records.get(path),quantidade:8,volume:8});
 const shape={madeiraId:'wood',tipoCadastro:'m3',largura:100,espessura:100,comprimento:1};
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/adjust',{...shape,id:'adjust',tipo:'ajuste',ajusteConferenciaV391:true,grupoCargaId:'load',quantidade:2,volume:2,data:'08/11/2026, 09:30:00',valor:99999});
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/out',{...shape,id:'out',tipo:'saida',grupoCargaId:'load',quantidade:4,volume:4,data:'08/11/2026, 10:00:00'});
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/load-line',{...shape,id:'load-line',tipoMedida:'m3',quantidade:4,volume:4,valor:8000,cargaStatus:'concluido',cargaBaixadaEm:at+3600000,grupoCargaId:'load'});
 const writes=s.writes.length,sale=(await projectLoadSales(s.db,'tenant',{from:'2026-11-08',to:'2026-11-08'}))[0];
 assert.equal(sale.costCents,520000);assert.equal(sale.source.costMode,'average');assert.equal(sale.source.usesConferenceAverage,true);assert.equal(s.writes.length,writes);
});

test('a load in another measure receives the prior same-species purchase average only as a conference reference',async()=>{
 const s=purchaseTestDb();await confirmStockPurchase(s.db,s.identity,purchase({freightCents:0,otherCents:0,lines:[line({quantidade:10,volume:10,unitCents:130000})]}),at);
 const shape={madeiraId:'wood',tipoCadastro:'m3',largura:50,espessura:100,comprimento:1};
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/adjust-ref',{...shape,id:'adjust-ref',tipo:'ajuste',ajusteConferenciaV391:true,grupoCargaId:'load-ref',quantidade:8,volume:4,data:'08/11/2026, 09:30:00'});
 s.records.set('empresas/tenant/dados/sm2_movimentos/registros/out-ref',{...shape,id:'out-ref',tipo:'saida',grupoCargaId:'load-ref',quantidade:8,volume:4,data:'08/11/2026, 10:00:00'});
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/ref-line',{...shape,id:'ref-line',tipoMedida:'m3',quantidade:8,volume:4,valor:8000,cargaStatus:'concluido',cargaBaixadaEm:at+3600000,grupoCargaId:'load-ref'});
 const writes=s.writes.length,sale=(await projectLoadSales(s.db,'tenant',{from:'2026-11-08',to:'2026-11-08'}))[0];assert.equal(sale.costCents,520000);assert.equal(sale.source.usesSpeciesReference,true);assert.equal(sale.source.costMode,'average');assert.equal(s.writes.length,writes);
});

test('draft grouping preserves dimensions, species, price, condition and drying period boundaries',()=>{
 const first=line(),second=line({id:'a2d00244-a75c-44a4-aa30-bd78176a744d'}),before=JSON.stringify([first,second]);
 const merged=groupStockPurchaseLinesV754([first,second]);assert.equal(merged.length,1);assert.equal(merged[0].quantidade,4);assert.equal(merged[0].volume,4);assert.equal(merged[0].id,first.id);assert.equal(JSON.stringify([first,second]),before);
 for(const change of [{madeiraId:'other'},{largura:99},{espessura:99},{comprimento:2},{unitCents:120000},{estadoMadeira:'verde'},{secagemDias:30}])assert.equal(groupStockPurchaseLinesV754([first,{...second,...change}]).length,2);
 const bulk={...first,tipoMedida:'granel',largura:0,espessura:0,comprimento:0,quantidade:.1,volume:.1},grouped=groupStockPurchaseLinesV754([bulk,{...bulk,id:second.id,quantidade:.2,volume:.2}]);assert.equal(grouped[0].volume,.3);assert.equal(grouped[0].quantidade,.3);
 const result=normalizeStockPurchase(purchase({lines:merged}));assert.equal(result.goodsCents,400000);assert.equal(result.totalCents,430000);
});

test('grouping fractional dimensions recomputes physical volume without accumulating per-launch rounding',()=>{
 const original=line({largura:1.234,espessura:2.345,comprimento:3.456,quantidade:1,volume:1.234/100*2.345/100*3.456});
 const rows=Array.from({length:201},(_,n)=>({...original,id:'line-'+n}));const grouped=groupStockPurchaseLinesV754(rows);assert.equal(grouped[0].volume,original.largura/100*original.espessura/100*original.comprimento*201);
 grouped[0].id=lineId;assert.doesNotThrow(()=>normalizeStockPurchase(purchase({lines:grouped})));
});

test('mixed m² and linear purchases create atomic physical entries with private costs and retry safely',async()=>{
 const s=purchaseTestDb();s.records.set('empresas/tenant/dados/sm2_madeiras/registros/area',{nome:'Forro',tipoCadastro:'m2'});s.records.set('empresas/tenant/dados/sm2_madeiras/registros/metre',{nome:'Pinus',tipoCadastro:'linear',regrasLinear:[{tipo:'Ripa',codigo:'R1'},{tipo:'Rodapé',codigo:'RD'}]});
 const area=line({madeiraId:'area',tipoMedida:'m2',largura:20,espessura:0,comprimento:3,quantidade:20,volume:12,unitCents:2500,purchasePacketsV755:2,purchasePiecesPerPacketV755:10});
 const linear=line({id:'a2d00244-a75c-44a4-aa30-bd78176a744d',madeiraId:'metre',tipoMedida:'linear',produto:'Ripa',codigoProduto:'R1',largura:0,espessura:0,comprimento:0,quantidade:0,volume:70,unitCents:800,linearTotalV744:true});
 const raw=purchase({lines:[area,linear],freightCents:1000,otherCents:0}),result=await confirmStockPurchase(s.db,s.identity,raw,at),receipt=result.receipt;
 assert.equal(receipt.goodsCents,86000);assert.equal(receipt.totalCents,87000);assert.equal(receipt.lines.reduce((sum,l)=>sum+l.acquisitionCents,0),87000);
 const areaRow=s.records.get('empresas/tenant/dados/sm2_estoque1/registros/'+receipt.lines[0].stockId),metreRow=s.records.get('empresas/tenant/dados/sm2_estoque1/registros/'+receipt.lines[1].stockId);
 assert.equal(purchasePacketCountV755(areaRow),2);assert.equal(areaRow.quantidade,20);assert.equal(metreRow.produto,'Ripa');assert.equal(metreRow.codigoProduto,'R1');assert.equal(metreRow.linearTotalV744,true);assert.equal(metreRow.volumeReal,70);assert.equal(metreRow.quantidade,0);
 for(const row of [areaRow,metreRow]){assert.equal(row.preco,0);assert.equal(row.valor,0);assert.equal(row.unitCents,undefined);assert.equal(row.acquisitionCents,undefined);}
 assert((await confirmStockPurchase(s.db,s.identity,raw,at+1000)).repeated);
});
test('new purchase units reject inconsistent physical quantity, product, packet count and catalog changes',async()=>{
 const area=line({tipoMedida:'m2',largura:20,espessura:0,comprimento:3,quantidade:10,volume:6});
 const linear=line({tipoMedida:'linear',produto:'Ripa',largura:0,espessura:0,comprimento:3,quantidade:10,volume:30});
 assert.equal(normalizeStockPurchase(purchase({lines:[linear]})).goodsCents,3000000);
 for(const bad of [{...area,volume:7},{...area,purchasePacketsV755:2,purchasePiecesPerPacketV755:10},{...linear,volume:35},{...linear,produto:''},{...linear,quantidade:0},{...linear,linearTotalV744:true},{...area,estadoMadeira:'verde'}])assert.throws(()=>normalizeStockPurchase(purchase({lines:[bad]})));
 const s=purchaseTestDb();s.records.set('empresas/tenant/dados/sm2_madeiras/registros/wood',{nome:'Pinus',tipoCadastro:'linear',regrasLinear:[{tipo:'Rodapé'}]});await assert.rejects(()=>confirmStockPurchase(s.db,s.identity,purchase({lines:[linear]}),at),/tipo de produto/);assert.equal(s.writes.length,0);
});
test('stock purchase initializes payment without changing cost and confirmation retry never duplicates it',async()=>{
 const s=purchaseTestDb(),raw=purchase({payment:{mode:'partial',paidCents:10000,paidDate:'2026-11-08',dueDate:'2026-12-08'}}),result=await confirmStockPurchase(s.db,s.identity,raw,at),receipt=result.receipt,entry=s.records.get(financeCollectionPath('tenant')+'/'+receipt.entryId);
 assert.equal(entry.settlement.payments.length,1);assert.equal(entry.settlement.payments[0].amountCents,10000);assert.equal(entry.amountCents,230000);assert.equal(receipt.lines[0].acquisitionCents,230000);const writes=s.writes.length;await confirmStockPurchase(s.db,s.identity,raw,at+1);assert.equal(s.writes.length,writes);
});
