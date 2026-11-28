import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeLoadTransport,TRANSPORT_COSTS} from '../public/load-transport.mjs';
import {getLoadTransport,saveLoadTransport,transportRecordKeys} from '../Netlify/Funtions/lib/load-transport.mjs';
import {saveFinanceEntry,cancelFinanceEntry,financeCollectionPath} from '../Netlify/Funtions/lib/company-finance.mjs';
import {aggregateFinance} from '../public/company-finance.mjs';
const now=Date.UTC(2026,10,8),gid='load-abc';
const costs=extra=>({...Object.fromEntries(Object.keys(TRANSPORT_COSTS).map(k=>[k,0])),...extra});
const sample=extra=>({loadId:gid,revision:0,mode:'own',date:'2026-11-07',costs:costs({fuel:8000}),...extra});
function setup(){
 const loadPath='empresas/tenant/dados/sm2_carregamentos/registros/item',data=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}],[loadPath,{grupoCargaId:gid,cargaStatus:'concluido',cargaBaixadaEm:now,financeiroOriginalV403:{frete:200}}]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:data.has(path),data:()=>structuredClone(data.get(path))});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>{const filters=[];let max=Infinity;const q={where:(k,op,v)=>{filters.push([k,op,v]);return q;},limit:n=>{max=n;return q;},get:async()=>({docs:[...data.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>data.get(p)[k]===v)).slice(0,max).map(snap)})};return q;},async runTransaction(fn){db.beforeTransaction?.();let writing=false;const pending=[];const result=await fn({get:async ref=>{assert(!writing);return snap(ref.path);},set:(ref,value)=>{writing=true;pending.push([ref.path,value]);},create:(ref,value)=>{assert(!data.has(ref.path));writing=true;pending.push([ref.path,value]);}});for(const [p,v] of pending){data.set(p,structuredClone(v));writes.push(p);}return result;}};
 return {db,data,writes,loadPath,identity:{uid:'owner',emailVerified:true}};
}
test('own, hired and direct-paid modes only accept their real cost fields, never customer freight',()=>{
 assert.equal(normalizeLoadTransport(sample({costs:costs({fuel:8000,tolls:1000})})).totalCents,9000);
 assert.equal(normalizeLoadTransport(sample({mode:'contracted',costs:costs({carrier:15000,tolls:2000})})).totalCents,17000);
 assert.equal(normalizeLoadTransport(sample({mode:'customer',costs:costs({})})).totalCents,0);
 for(const input of [sample({mode:'contracted'}),sample({mode:'customer'}),sample({costs:costs({fuel:-1})}),sample({costs:costs({fuel:1.5})}),sample({date:null}),sample({freightCharged:20000})])assert.throws(()=>normalizeLoadTransport(input));
});
test('own fuel creates exactly its expense; customer freight and stock documents stay unchanged',async()=>{
 const s=setup(),original=JSON.stringify(s.data.get(s.loadPath)),result=await saveLoadTransport(s.db,s.identity,sample(),now);
 assert.equal(result.entry.amountCents,8000);assert.equal(result.entry.type,'expense');assert.equal(result.entry.source.loadId,gid);assert.equal(JSON.stringify(s.data.get(s.loadPath)),original);assert(s.writes.every(p=>p.startsWith(financeCollectionPath('tenant'))));
 const report=aggregateFinance([result.entry],{from:'2026-11-01',to:'2026-11-30'});assert.equal(report.total.expense,8000);assert.equal(report.total.sale,0);
});
test('repeated save is idempotent and changed costs update the same linked expense',async()=>{
 const s=setup(),r=await saveLoadTransport(s.db,s.identity,sample(),now),count=s.writes.length;const savedConfig=[...s.data.entries()].find(([path])=>path.includes('Transporte/')&&!path.includes('/versoes/'));savedConfig[1].costs=Object.fromEntries(Object.entries(savedConfig[1].costs).reverse());await saveLoadTransport(s.db,s.identity,sample(),now+1);assert.equal(s.writes.length,count);
 const changed=await saveLoadTransport(s.db,s.identity,sample({revision:1,costs:costs({fuel:9000})}),now+2);assert.equal(changed.entry.id,r.entry.id);assert.equal(changed.entry.amountCents,9000);assert.equal(changed.config.revision,2);
 assert.equal((await getLoadTransport(s.db,s.identity,gid,now)).config.totalCents,9000);await assert.rejects(saveLoadTransport(s.db,s.identity,sample({costs:costs({fuel:10000})}),now+3),e=>e.status===409);
});
test('customer direct payment removes linked expense and own transport can be restored without duplicates',async()=>{
 const s=setup();await saveLoadTransport(s.db,s.identity,sample(),now);let r=await saveLoadTransport(s.db,s.identity,sample({revision:1,mode:'customer',costs:costs({})}),now+1);assert.equal(r.entry.status,'cancelled');assert.equal(aggregateFinance([r.entry],{from:'2026-11-01',to:'2026-11-30'}).total.expense,0);
 const id=r.entry.id;r=await saveLoadTransport(s.db,s.identity,sample({revision:2}),now+2);assert.equal(r.entry.status,'active');assert.equal(r.entry.id,id);assert.equal(r.entry.amountCents,8000);
});
test('linked expenses cannot be changed or canceled through the independent manual ledger',async()=>{
 const s=setup(),r=await saveLoadTransport(s.db,s.identity,sample(),now),{source,status,createdAt,createdBy,updatedAt,updatedBy,...entry}=r.entry;
 await assert.rejects(saveFinanceEntry(s.db,s.identity,entry,now+1),e=>e.status===409);await assert.rejects(cancelFinanceEntry(s.db,s.identity,{id:entry.id,revision:entry.revision},now+1),e=>e.status===409);
});
test('no owner, no completed load, foreign load and membership swap fail before any writes',async()=>{
 for(const mode of ['employee','missing','draft','foreign','swap']){
  const s=setup();if(mode==='employee')s.data.get('empresas/tenant').ownerUid='other';if(mode==='missing')s.data.delete(s.loadPath);if(mode==='draft'){s.data.get(s.loadPath).cargaStatus='montagem';delete s.data.get(s.loadPath).cargaBaixadaEm;}if(mode==='foreign'){s.data.set(s.loadPath.replace('/tenant/','/foreign/'),s.data.get(s.loadPath));s.data.delete(s.loadPath);}if(mode==='swap')s.db.beforeTransaction=()=>{s.data.get('membros/owner').empresaId='other';s.data.set('empresas/other',{ownerUid:'owner'});};
  await assert.rejects(saveLoadTransport(s.db,s.identity,sample(),now));assert.equal(s.writes.length,0);
 }
});
test('stable ids do not include load names or allow a load id to create arbitrary document paths',()=>{
 const a=transportRecordKeys('test/../other'),b=transportRecordKeys(gid);assert.match(a.configId,/^[0-9a-f]{64}$/);assert.match(a.entryId,/^[0-9a-f-]{36}$/);assert.notEqual(a.entryId,b.entryId);assert.deepEqual(transportRecordKeys(gid),b);
});
