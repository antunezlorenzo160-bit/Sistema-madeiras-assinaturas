import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeLogPurchaseV756,groupLogPurchaseLinesV756} from '../public/log-purchase.mjs';
import {volumeToras} from '../public/toras.mjs';
import {confirmLogPurchase,cancelLogPurchase,listLogPurchases,logPurchaseRecordsPath} from '../Netlify/Funtions/lib/log-purchase.mjs';
import {financeCollectionPath,saveFinanceEntry,cancelFinanceEntry,listFinanceEntries} from '../Netlify/Funtions/lib/company-finance.mjs';
import {billingAccessWindow,BILLING_ACCESS_DAY} from '../public/billing-access.mjs';
const now=Date.UTC(2026,10,14,12),id='8a58eaf9-6084-4bb0-b68e-062fcf477f4b',lineId='b28dedf2-646b-4981-b7ae-0de09b5ed6bd';
const line=(extra={})=>({id:lineId,especie:'Pinus',diametro:30,comprimento:4,quantidade:10,unitCents:100000,...extra});
const input=(extra={})=>({companyId:'tenant',id,date:'2026-11-14',supplier:'Fornecedor',reference:'Nota A',freightCents:10000,otherCents:5000,freightIncluded:false,otherIncluded:false,lines:[line()],...extra});
function setup(){
 const records=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}]]),writes=[];
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const query=(path,filters=[],max=Infinity)=>({where:(k,op,v)=>query(path,[...filters,[k,op,v]],max),orderBy:()=>query(path,filters,max),limit:n=>query(path,filters,n),get:async()=>({docs:[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>op==='=='?records.get(p)[k]===v:op==='in'?v.includes(records.get(p)[k]):op==='>='?records.get(p)[k]>=v:records.get(p)[k]<=v)).slice(0,max).map(snap)})});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>query(path),runTransaction:async fn=>{db.before?.();let writing=false;const pending=[];const result=await fn({get:async ref=>{assert(!writing,'all reads precede writes');return snap(ref.path);},create:(ref,value)=>{assert(!records.has(ref.path));writing=true;pending.push([ref.path,value]);},set:(ref,value)=>{writing=true;pending.push([ref.path,value]);}});for(const [path,value]of pending){records.set(path,structuredClone(value));writes.push(path);}return result;}};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true}};
}
test('cylindrical purchase volume, exact cents and included fees; grouping preserves species and prices',()=>{
 const result=normalizeLogPurchaseV756(input());assert.equal(result.lines[0].volume,Math.round(volumeToras(30,4,10).total*1e9)/1e9);assert.equal(result.totalCents,result.goodsCents+15000);assert.equal(result.lines.reduce((s,l)=>s+l.acquisitionCents,0),result.totalCents);
 assert.equal(normalizeLogPurchaseV756(input({freightIncluded:true,otherIncluded:true})).totalCents,result.goodsCents);
 const next=line({id:'a2d00244-a75c-44a4-aa30-bd78176a744d',especie:' PINÚS '}),rows=[line(),next],before=JSON.stringify(rows),group=groupLogPurchaseLinesV756(rows);assert.equal(group.length,1);assert.equal(group[0].quantidade,20);assert.equal(JSON.stringify(rows),before);
 for(const extra of [{especie:'Garapeira'},{diametro:31},{comprimento:5},{unitCents:99900}])assert.equal(groupLogPurchaseLinesV756([line(),{...next,...extra}]).length,2);
 for(const bad of [input({date:'2026-02-30'}),input({supplier:''}),input({lines:[line({quantidade:1.5})]}),input({lines:[line({diametro:0})]}),input({lines:[line({unitCents:0})]}),input({lines:[line({precoMaoObra:1})]}),input({lines:[line(),line()]}),input({freightCents:-1})])assert.throws(()=>normalizeLogPurchaseV756(bad));
});
test('confirmation creates one private receipt and one purchase entry; retry and cancellation are atomic',async()=>{
 const s=setup(),raw=input(),first=await confirmLogPurchase(s.db,s.identity,raw,now),receipt=first.receipt,path=financeCollectionPath('tenant')+'/'+receipt.entryId;
 assert.equal(s.writes.length,3);assert.equal(s.records.get(path).type,'purchase');assert.equal(s.records.get(path).source.type,'log-purchase');assert.equal(s.records.get(path).amountCents,receipt.totalCents);assert(!s.writes.some(p=>p.includes('/dados/')),'no logs mixed into labour list or sawn stock');
 assert((await confirmLogPurchase(s.db,s.identity,raw,now+1000)).repeated);assert.equal(s.writes.length,3);await assert.rejects(()=>confirmLogPurchase(s.db,s.identity,input({supplier:'Outra'}),now),/outros valores/);
 const listed=await listLogPurchases(s.db,s.identity,{from:'2026-11-01',to:'2026-11-30'},now);assert.equal(listed.receipts.length,1);
 const finance=await listFinanceEntries(s.db,s.identity,{from:'2026-11-01',to:'2026-11-30'},now);assert.equal(finance.entries.filter(r=>r.source?.type==='log-purchase').length,1);
 const entry=s.records.get(path);await assert.rejects(()=>saveFinanceEntry(s.db,s.identity,{id:entry.id,revision:entry.revision,type:'purchase',date:entry.date,description:entry.description,partner:entry.partner,reference:entry.reference,category:'wood',amountCents:1,costCents:null},now),/aba Toras/);await assert.rejects(()=>cancelFinanceEntry(s.db,s.identity,{id:entry.id,revision:1},now),/aba Toras/);
 const cancel={companyId:'tenant',id,revision:1},cancelled=await cancelLogPurchase(s.db,s.identity,cancel,now+2000);assert.equal(cancelled.receipt.status,'cancelled');assert.equal(s.records.get(path).status,'cancelled');assert.equal(s.records.get(path).revision,2);const writes=s.writes.length;assert((await cancelLogPurchase(s.db,s.identity,cancel,now+3000)).repeated);assert.equal(s.writes.length,writes);assert((await confirmLogPurchase(s.db,s.identity,raw,now+4000)).repeated);assert.equal(s.records.get(path).status,'cancelled');
});
test('owner/company/verified email/billing checked again within transaction; malformed purchases write nothing',async()=>{
 for(const change of [s=>s.identity.emailVerified=false,s=>s.identity.uid='employee',s=>s.records.set('empresas/tenant',{ownerUid:'another'})]){const s=setup();change(s);await assert.rejects(()=>confirmLogPurchase(s.db,s.identity,input(),now));assert.equal(s.writes.length,0);}
 const cross=setup();await assert.rejects(()=>confirmLogPurchase(cross.db,cross.identity,input({companyId:'other'}),now));assert.equal(cross.writes.length,0);
 const changed=setup();changed.db.before=()=>changed.records.set('membros/owner',{ativo:false,empresaId:'tenant',papel:'admin'});await assert.rejects(()=>confirmLogPurchase(changed.db,changed.identity,input(),now));assert.equal(changed.writes.length,0);
 const billing=setup();billing.records.set('empresas/tenant/acesso/plano',billingAccessWindow(now-6*BILLING_ACCESS_DAY));assert.equal((await listLogPurchases(billing.db,billing.identity,{from:'2026-11-01',to:'2026-11-30'},now)).canWrite,false);await assert.rejects(()=>confirmLogPurchase(billing.db,billing.identity,input(),now),e=>e.status===403);assert.equal(billing.writes.length,0);
 const invalid=setup();await assert.rejects(()=>confirmLogPurchase(invalid.db,invalid.identity,input({lines:[line({volume:99})]}),now));assert.equal(invalid.writes.length,0);
});
