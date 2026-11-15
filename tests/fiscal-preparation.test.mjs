import test from 'node:test';import assert from 'node:assert/strict';
import {fiscalSnapshotV762,fiscalDataV762,fiscalPartyV762,fiscalIssuesV762} from '../public/fiscal-preparation.mjs';
import {readFiscalPreparation,saveFiscalPreparation,fiscalPrefixV762} from '../Netlify/Funtions/lib/fiscal-preparation.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../public/billing-access.mjs';
const now=Date.UTC(2026,10,15,12),source={type:'order',id:'order-1'},load={type:'load',id:'load-1'};
const line=(extra={})=>({id:'item-1',madeira:'Garapeira',madeiraId:'wood',tipoMedida:'m3',volume:2,quantidade:10,valor:4000,grupoCargaId:'load-1',cargaStatus:'baixada',cargaFechadaEm:now,...extra});
function setup(){
 const records=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}],['empresas/tenant/dados/sm2_orcamentos_guardados/registros/order-1',{cliente:'Cliente',status:'pendente',itens:[line()],desconto:10}],['empresas/tenant/dados/sm2_carregamentos/registros/item-1',line({dadosClienteCargaV407:{nome:'Cliente'},financeiroOriginalV403:{tipoDesconto:'valor',desconto:100,frete:200,outras:50},financeiroCopiaV403:{frete:999},copiaComercialPercentualV400:10})]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const query=(path,filters=[],max=Infinity)=>({isQuery:true,where:(k,op,v)=>query(path,[...filters,[k,op,v]],max),orderBy:()=>query(path,filters,max),limit:n=>query(path,filters,n),get:async()=>({docs:[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>op==='=='&&records.get(p)[k]===v)).slice(0,max).map(snap)})});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>query(path),runTransaction:async fn=>{db.before?.();let writing=false;const pending=[];const result=await fn({get:async ref=>{assert(!writing,'transaction reads precede writes');return ref.isQuery?ref.get():snap(ref.path);},create:(ref,v)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,v]);},set:(ref,v)=>{writing=true;pending.push([ref.path,v]);}});for(const [p,v]of pending){records.set(p,structuredClone(v));writes.push(p);}return result;}};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true}};
}
const request=(r,extra={})=>({companyId:'tenant',action:'draft',source:r.snapshot.source,signature:r.signature,revision:r.draft?.revision||0,data:r.data,...extra});
test('all units preserve actual quantities and totals; commercial simulation percentages are excluded',()=>{
 const items=[line(),line({id:'area',tipoMedida:'m2',volume:15,valor:300}),line({id:'linear',tipoMedida:'linear',volume:70,quantidade:0,comprimento:0,linearTotalV744:true,valor:728}),line({id:'bulk',tipoMedida:'granel',volume:1,valor:900})].map(i=>({...i,copiaComercialPercentualV400:10,financeiroOriginalV403:{tipoDesconto:'percentual',desconto:10,frete:200,outras:50}}));
 const before=JSON.stringify(items),s=fiscalSnapshotV762(load,items);assert.deepEqual(s.lines.map(l=>[l.unit,l.quantity]),[['M3',2],['M2',15],['M',70],['M3',1]]);assert.deepEqual(s.totals,{subtotalCents:592800,discountCents:59280,freightCents:20000,otherCents:5000,totalCents:558520});assert.equal(JSON.stringify(items),before);assert.equal(s.notIssued,true);assert.throws(()=>fiscalSnapshotV762(load,[line({cargaStatus:'montagem',cargaFechadaEm:null})]),/Feche/);
 assert.throws(()=>fiscalDataV762({products:[{key:'a',ncm:'123',cfop:'1234'}]}),/8 dígitos/);assert.throws(()=>fiscalPartyV762({certificate:'secret'}));
});
test('quote confirmation reuses same preparation; stale origin cannot silently replace financial data',async()=>{
 const s=setup(),r=await readFiscalPreparation(s.db,s.identity,{source},now),before=JSON.stringify([...s.records].filter(([p])=>p.includes('/dados/')));assert.equal(s.writes.length,0);assert.equal(r.snapshot.totals.totalCents,360000);
 const input=request(r),first=await saveFiscalPreparation(s.db,s.identity,input,now),count=s.writes.length;await saveFiscalPreparation(s.db,s.identity,input,now);assert.equal(s.writes.length,count);assert.equal(first.draft.status,'not-issued');
 s.records.get('empresas/tenant/dados/sm2_orcamentos_guardados/registros/order-1').status='confirmado';const confirmed=await readFiscalPreparation(s.db,s.identity,{source},now);assert.equal(confirmed.draft.id,first.draft.id);assert.equal(confirmed.snapshot.label,'Pedido');assert.equal(confirmed.sourceChanged,true);
 await assert.rejects(()=>saveFiscalPreparation(s.db,s.identity,{...input,revision:1},now),/origem mudou/);assert(s.writes.every(p=>p.startsWith(fiscalPrefixV762('tenant'))));assert.equal(before.replace('pendente','confirmado'),JSON.stringify([...s.records].filter(([p])=>p.includes('/dados/'))));
});
test('load links to original quote draft atomically; both entry points reuse one draft and no extra sale',async()=>{
 const s=setup(),quote=await readFiscalPreparation(s.db,s.identity,{source},now);await saveFiscalPreparation(s.db,s.identity,request(quote),now);
 const r=await readFiscalPreparation(s.db,s.identity,{source:load,orderId:'order-1'},now);assert.equal(r.draft.revision,1);assert.equal(r.snapshot.totals.totalCents,415000);
 const result=await saveFiscalPreparation(s.db,s.identity,request(r,{orderId:'order-1'}),now);assert.equal(result.draft.revision,2);
 const a=await readFiscalPreparation(s.db,s.identity,{source},now),b=await readFiscalPreparation(s.db,s.identity,{source:load},now);assert.equal(a.draft.id,b.draft.id);assert.equal(a.snapshot.source.type,'load');assert.equal(a.snapshot.totals.totalCents,415000);assert.equal((await readFiscalPreparation(s.db,s.identity,{},now)).drafts.length,1);
 s.records.set('empresas/tenant/dados/sm2_carregamentos/registros/other',line({id:'other',grupoCargaId:'load-2'}));await assert.rejects(()=>readFiscalPreparation(s.db,s.identity,{source:{type:'load',id:'load-2'},orderId:'order-1'},now),/outro vínculo/);
 assert(s.writes.every(p=>p.startsWith(fiscalPrefixV762('tenant'))));
});
test('independent existing preparations cannot merge or overwrite one another',async()=>{
 const s=setup();for(const src of [source,load]){const r=await readFiscalPreparation(s.db,s.identity,{source:src},now);await saveFiscalPreparation(s.db,s.identity,request(r),now);}const count=s.writes.length;
 await assert.rejects(()=>readFiscalPreparation(s.db,s.identity,{source:load,orderId:'order-1'},now),/separadas/);const r=await readFiscalPreparation(s.db,s.identity,{source:load},now);await assert.rejects(()=>saveFiscalPreparation(s.db,s.identity,request(r,{orderId:'order-1'}),now),/separadas/);assert.equal(s.writes.length,count);
});
test('company configuration isolated, versioned and retry safe; no secret, emission or approval state accepted',async()=>{
 const s=setup(),input={companyId:'tenant',action:'config',revision:0,party:{nome:'Madeiras',documento:'CNPJ'}};const result=await saveFiscalPreparation(s.db,s.identity,input,now),count=s.writes.length;await saveFiscalPreparation(s.db,s.identity,input,now);assert.equal(s.writes.length,count);assert.equal(result.config.provider,null);assert.equal(result.config.environment,'preparation');
 await assert.rejects(()=>saveFiscalPreparation(s.db,s.identity,{...input,party:{nome:'Outra'}},now),/cadastro fiscal mudou/);await assert.rejects(()=>saveFiscalPreparation(s.db,s.identity,{...input,action:'emit'},now),/inválido/);await assert.rejects(()=>saveFiscalPreparation(s.db,s.identity,{...input,companyId:'other'},now),/empresa mudou/);
 const r=await readFiscalPreparation(s.db,s.identity,{source},now);assert(fiscalIssuesV762(r.snapshot,result.config.party,r.data).some(i=>i.includes('Integração')));
 s.records.set('membros/owner',{ativo:true,empresaId:'other',papel:'admin'});s.records.set('empresas/other',{ownerUid:'owner'});const other=await readFiscalPreparation(s.db,s.identity,{},now);assert.equal(other.config,null);assert.equal(other.drafts.length,0);
});
test('owner, verified mail, billing and transactional membership checked; concurrent drafts reject',async()=>{
 const s=setup();await assert.rejects(()=>readFiscalPreparation(s.db,{...s.identity,emailVerified:false},{source},now));s.records.get('empresas/tenant').ownerUid='someone';await assert.rejects(()=>readFiscalPreparation(s.db,s.identity,{source},now));
 const t=setup(),r=await readFiscalPreparation(t.db,t.identity,{source},now);t.db.before=()=>t.records.set('membros/owner',{ativo:false,empresaId:'tenant'});await assert.rejects(()=>saveFiscalPreparation(t.db,t.identity,request(r),now));assert.equal(t.writes.length,0);
 const b=setup();b.records.set('empresas/tenant/acesso/plano',billingAccessWindow(now-6*BILLING_ACCESS_DAY));assert.equal((await readFiscalPreparation(b.db,b.identity,{source},now)).canWrite,false);await assert.rejects(()=>saveFiscalPreparation(b.db,b.identity,request(r),now));
 const c=setup(),v=await readFiscalPreparation(c.db,c.identity,{source},now);await saveFiscalPreparation(c.db,c.identity,request(v),now);await assert.rejects(()=>saveFiscalPreparation(c.db,c.identity,request(v,{data:{...v.data,notes:'concurrent'}}),now),/outro aparelho/);
});
