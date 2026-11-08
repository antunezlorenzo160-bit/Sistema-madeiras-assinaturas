import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {completedLoadSale,reviewLoadSaleDuplicates,loadSaleManualCost} from '../public/load-sales.mjs';
import {describeLoadSale,projectLoadSales,saveLoadSaleConfig,loadSaleKeys} from '../Netlify/Funtions/lib/load-sales.mjs';
import {listFinanceEntries,financeCollectionPath} from '../Netlify/Funtions/lib/company-finance.mjs';
import {aggregateFinance} from '../public/company-finance.mjs';
const at=Date.UTC(2026,10,8,2,25),now=at+1000,gid='load-sale-a',range={from:'2026-11-01',to:'2026-11-07'};
function line(extra={}){return {id:'line',grupoCargaId:gid,cargaStatus:'concluido',cargaBaixadaEm:at,atualizadoEm:at,valor:100,quantidade:10,volume:1,tipoMedida:'m3',madeiraId:'wood',...extra};}
function setup(){
 const records=new Map([['membros/owner',{ativo:true,papel:'admin',empresaId:'tenant'}],['empresas/tenant',{ownerUid:'owner'}],['empresas/tenant/dados/sm2_carregamentos/registros/a',line({id:'a'})]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 function query(path,filters=[],order=null,max=Infinity){return {isQuery:true,where:(k,op,v)=>query(path,[...filters,[k,op,v]],order,max),orderBy:(k,dir)=>query(path,filters,[k,dir],max),limit:n=>query(path,filters,order,n),get:async()=>{const paths=[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>op==='=='?records.get(p)[k]===v:op==='>='?records.get(p)[k]>=v:records.get(p)[k]<=v));if(order)paths.sort((a,b)=>{const x=records.get(a)[order[0]],y=records.get(b)[order[0]];return (x<y?-1:x>y?1:0)*(order[1]==='desc'?-1:1);});return {docs:paths.slice(0,max).map(snap)};}};}
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>query(path),async runTransaction(fn){db.beforeTransaction?.();const pending=[];let writing=false;const result=await fn({get:async ref=>{assert(!writing);return ref.isQuery?ref.get():snap(ref.path);},set:(ref,value)=>{writing=true;pending.push([ref.path,value]);},create:(ref,value)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,value]);}});for(const [path,value] of pending){records.set(path,structuredClone(value));writes.push(path);}return result;}};
 return {records,writes,db,identity:{uid:'owner',emailVerified:true},path:'empresas/tenant/dados/sm2_carregamentos/registros/a'};
}
const config=(entry,extra={})=>({loadId:gid,revision:entry.revision,signature:entry.source.signature,include:true,costCents:6000,manualEntry:null,resolution:'none',...extra});
test('total matches the actual original-document calculation, including discount and charged freight; copy ignored',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),source=JSON.parse(html.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]),start=source.indexOf('  function arredondarV403('),end=source.indexOf('  function subtotalDocumentoV403(',start),c={};vm.createContext(c);vm.runInContext(source.slice(start,end),c);
 for(const type of ['percentual','valor'])for(const subtotal of [0,0.105,10.55,2733.92,10000]){
  const cfg={tipoDesconto:type,desconto:Math.min(5,subtotal),frete:200,outras:10},row=line({valor:subtotal,financeiroOriginalV403:cfg,copiaComercialPercentualV400:25,financeiroCopiaV403:{frete:900}}),expected=c.calcularFinanceiroV403(subtotal,cfg);
  assert.equal(completedLoadSale([row]).amountCents,Math.round(expected.total*100));
 }
});
test('only fully completed, non-archived loads qualify; date is the day of the stock exit in Brazil',()=>{
 assert.equal(completedLoadSale([line()]).date,'2026-11-07');
 for(const row of [line({cargaBaixadaEm:null,cargaStatus:'aguardando_conferencia'}),line({cargaStatus:'montagem'}),line({cargaArquivadaInconsistenteEm:now}),line({cargaStatus:'cancelado'})])assert.equal(completedLoadSale([row]),null);
 assert.equal(completedLoadSale([line(),line({cargaBaixadaEm:null})]),null);
 assert.throws(()=>completedLoadSale([line({financeiroOriginalV403:{tipoDesconto:'percentual',desconto:101}})]));
});
test('financial consultation projects one complete sale from all rows, plus existing expenses, with no writes',async()=>{
 const s=setup();s.records.get(s.path).valor=100;s.records.set(s.path.replace('/a','/b'),line({id:'b',valor:200,financeiroOriginalV403:{frete:50,outras:20,tipoDesconto:'percentual',desconto:10,atualizadoEm:1}}));
 s.records.set(financeCollectionPath('tenant')+'/expense',{id:'expense',date:'2026-11-07',type:'expense',amountCents:2000,costCents:null,status:'active',updatedAt:at});
 const result=await listFinanceEntries(s.db,s.identity,range,now),sale=result.entries.find(r=>r.source?.type==='load-sale');assert.equal(sale.amountCents,34000);assert.equal(sale.costCents,null);assert.equal(result.entries.length,2);assert.equal(s.writes.length,0);
 const report=aggregateFinance(result.entries,range);assert.equal(report.total.sale,34000);assert.equal(report.total.expense,2000);assert.equal(report.total.result,null);
 assert.equal((await listFinanceEntries(s.db,s.identity,{from:'2026-11-08',to:'2026-11-08'},now)).entries.length,0);
});
test('partial completion cannot create partial revenue and repeated consultations do not duplicate a sale',async()=>{
 const s=setup();s.records.set(s.path.replace('/a','/b'),line({id:'b',cargaStatus:'aguardando_conferencia',cargaBaixadaEm:null}));assert.equal((await projectLoadSales(s.db,'tenant',range)).length,0);s.records.get(s.path.replace('/a','/b')).cargaBaixadaEm=at;
 for(let n=0;n<2;n++){const rows=await projectLoadSales(s.db,'tenant',range);assert.equal(rows.length,1);assert.equal(rows[0].amountCents,20000);}assert.equal(s.writes.length,0);
});
test('cost persists independently; monetary corrections stay live; changed quantities require cost review',async()=>{
 const s=setup();let entry=(await projectLoadSales(s.db,'tenant',range))[0];await saveLoadSaleConfig(s.db,s.identity,config(entry),now);entry=(await projectLoadSales(s.db,'tenant',range))[0];assert.equal(entry.costCents,6000);
 s.records.get(s.path).valor=120;entry=(await projectLoadSales(s.db,'tenant',range))[0];assert.equal(entry.amountCents,12000);assert.equal(entry.costCents,6000);
 const stale=config(entry);s.records.get(s.path).quantidade=12;entry=(await projectLoadSales(s.db,'tenant',range))[0];assert.equal(entry.costCents,null);assert.equal(entry.source.costRequiresReview,true);await assert.rejects(saveLoadSaleConfig(s.db,s.identity,stale,now+1),e=>e.status===409);
 await saveLoadSaleConfig(s.db,s.identity,config(entry,{costCents:7000}),now+2);assert.equal((await projectLoadSales(s.db,'tenant',range))[0].costCents,7000);
});
test('matching manual sale requires review; explicit replacement cancels only the selected manual sale, and retry is idempotent',async()=>{
 const s=setup(),manualId='8a58eaf9-6084-4bb0-b68e-062fcf477f4b',manual={id:manualId,revision:1,type:'sale',date:'2026-11-07',amountCents:10000,costCents:6000,status:'active',updatedAt:at,description:'Venda manual'};s.records.set(financeCollectionPath('tenant')+'/'+manualId,manual);
 let result=await listFinanceEntries(s.db,s.identity,range,now),entry=result.entries.find(r=>r.source);assert.equal(entry.status,'pending-review');let report=aggregateFinance(result.entries,range);assert.equal(report.total.sale,10000);assert.equal(report.total.pendingSales,1);assert.equal(report.total.result,null);
 const request=config(entry,{manualEntry:{id:manualId,revision:1},resolution:'replace'});await saveLoadSaleConfig(s.db,s.identity,request,now);const count=s.writes.length;await saveLoadSaleConfig(s.db,s.identity,request,now+1);assert.equal(s.writes.length,count);
 result=await listFinanceEntries(s.db,s.identity,range,now);report=aggregateFinance(result.entries,range);assert.equal(report.total.sale,10000);assert.equal(report.total.cost,6000);assert.equal(report.total.result,4000);assert.equal(s.records.get(financeCollectionPath('tenant')+'/'+manualId).status,'cancelled');
});
test('separate-sale confirmation counts both; excluded load does not count and can be included again',async()=>{
 const s=setup();s.records.set(financeCollectionPath('tenant')+'/manual',{id:'manual',revision:1,type:'sale',date:'2026-11-07',amountCents:10000,costCents:4000,status:'active',updatedAt:at});let entry=(await projectLoadSales(s.db,'tenant',range))[0];await saveLoadSaleConfig(s.db,s.identity,config(entry,{resolution:'separate'}),now);
 let result=await listFinanceEntries(s.db,s.identity,range,now);assert.equal(aggregateFinance(result.entries,range).total.sale,20000);entry=result.entries.find(r=>r.source);await saveLoadSaleConfig(s.db,s.identity,config(entry,{include:false,resolution:'separate'}),now+1);result=await listFinanceEntries(s.db,s.identity,range,now);assert.equal(aggregateFinance(result.entries,range).total.sale,10000);
});
test('owner authorization, tenant isolation, source revisions and stale cost versions prevent unauthorized writes',async()=>{
 for(const mode of ['employee','foreign','unverified','changed','stale']){
  const s=setup(),entry=(await projectLoadSales(s.db,'tenant',range))[0];if(mode==='employee')s.records.get('empresas/tenant').ownerUid='other';if(mode==='foreign')s.records.get('membros/owner').empresaId='other';if(mode==='unverified')s.identity.emailVerified=false;if(mode==='changed')s.db.beforeTransaction=()=>{s.records.get(s.path).valor=999;};if(mode==='stale')await saveLoadSaleConfig(s.db,s.identity,config(entry),now);
  const count=s.writes.length;await assert.rejects(saveLoadSaleConfig(s.db,s.identity,config(entry,{costCents:123}),now+1));assert.equal(s.writes.length,count);
 }
});
test('mismatched or already-used manual entries cannot be silently canceled',async()=>{
 for(const change of [{amountCents:999},{date:'2026-11-06'},{status:'cancelled'},{source:{type:'something'}},{revision:2}]){
  const s=setup(),id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b';s.records.set(financeCollectionPath('tenant')+'/'+id,{id,revision:1,type:'sale',date:'2026-11-07',amountCents:10000,costCents:6000,status:'active',...change});const entry=(await projectLoadSales(s.db,'tenant',range))[0];await assert.rejects(saveLoadSaleConfig(s.db,s.identity,config(entry,{resolution:'replace',manualEntry:{id,revision:1}}),now));assert.equal(s.writes.length,0);
 }
});
test('public duplicate review is immutable and stable ids differ from transport or other loads',()=>{
 const sale=describeLoadSale([line()],gid),manual={id:'manual',type:'sale',status:'active',date:sale.date,amountCents:sale.amountCents,costCents:1},entries=[sale,manual],before=JSON.stringify(entries);assert.equal(reviewLoadSaleDuplicates(entries)[0].status,'pending-review');assert.equal(JSON.stringify(entries),before);assert.notEqual(loadSaleKeys(gid).entryId,loadSaleKeys('other').entryId);
});
test('services are separated only when they reconcile with the saved total; discount is allocated once',()=>{
 const row=line({valor:1430,valorMaterial:1300,valorServicos:130,endireitamento:true,financeiroOriginalV403:{tipoDesconto:'percentual',desconto:10,frete:50}}),before=JSON.stringify(row),sale=completedLoadSale([row]);
 assert.equal(sale.amountCents,133700);assert.equal(sale.serviceCents,11700);assert.equal(sale.woodCents,117000);assert.equal(sale.pendingServiceLines,0);assert.equal(JSON.stringify(row),before);
 const unknown=completedLoadSale([line({valor:1300,endireitamento:true,precoEndireitamento:10})]);assert.equal(unknown.amountCents,130000);assert.equal(unknown.serviceCents,null);assert.equal(unknown.woodCents,null);assert.equal(unknown.pendingServiceLines,1);
 assert.equal(completedLoadSale([line({valor:1300,valorMaterial:1300,valorServicos:130,endireitamento:true})]).serviceCents,null);
 assert.equal(completedLoadSale([line({valor:0,valorMaterial:0,valorServicos:0,endireitamento:true})]).serviceCents,0);
 assert.equal(completedLoadSale([line({valor:100,valorMaterial:90,valorEncaixe:10,valorServicos:10,tipoMedida:'linear',encaixe:true})]).serviceCents,1000);
});
test('new load services use saved percentages and repricing keeps both services without changing volume',async()=>{
 const {priceLoadServices}=await import('../public/load-sales.mjs');
 const input=line({volume:2,preco:100,endireitamento:true,aplainamento:true,precoEndireitamento:10,precoAplainamento:5}),before=JSON.stringify(input),priced=priceLoadServices(input);
 assert.equal(priced.valorMaterial,200);assert.equal(priced.valorServicos,30);assert.equal(priced.valor,230);assert.equal(priced.volume,2);assert.equal(JSON.stringify(input),before);
 const repriced=priceLoadServices({...priced,preco:200});assert.equal(repriced.valor,460);assert.equal(repriced.valorServicos,60);assert.equal(completedLoadSale([repriced]).serviceCents,6000);
 assert.equal(priceLoadServices({...priced,endireitamento:false,aplainamento:false}).valor,200);assert.throws(()=>priceLoadServices({...input,precoEndireitamento:-10}));
});

test('manual unit cost uses physical volume with exact cent rounding; total mode preserves old totals',()=>{
 assert.equal(loadSaleManualCost(130000,'m3',10),1300000);
 assert.equal(loadSaleManualCost(130000,'m3',12.9763),1686919);
 assert.equal(loadSaleManualCost(130000,'total',12.9763),130000);
 assert.equal(loadSaleManualCost(1,'m3',0.5),1);
 for(const volume of [null,undefined,NaN,0,-1,Infinity])assert.throws(()=>loadSaleManualCost(130000,'m3',volume));
 assert.throws(()=>loadSaleManualCost(100000000000,'m3',100));
 assert.throws(()=>loadSaleManualCost(-1,'total',10));
 assert.throws(()=>loadSaleManualCost(130000,'other',10));
});
