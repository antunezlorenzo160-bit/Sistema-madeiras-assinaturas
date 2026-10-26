import test from 'node:test';
import assert from 'node:assert/strict';
import {manageCompany,companyDetail,trialConfiguration} from '../Netlify/Funtions/lib/company-management.mjs';

const base='plataforma_admin/billing',companyPath=base+'/companies/tenant',subPath=base+'/subscriptions/tenant';
const now=Date.parse('2026-10-26T00:00:00Z');
function setup(){
 const records=new Map([[companyPath,{name:'Empresa',empresaId:'tenant',ownerUid:'owner',createdAt:1,email:'owner@example.com'}],
  [subPath,{empresaId:'tenant',status:'trial',trialMode:'indefinite',trialEndsAt:null,planId:null}],
  ['membros/owner',{empresaId:'tenant',ativo:true}],['membros/employee',{empresaId:'tenant',ativo:true}],
  ['membros/disabled',{empresaId:'tenant',ativo:false}],['membros/other',{empresaId:'other-company',ativo:true}]]);
 const snapshot=path=>({exists:records.has(path),id:path.split('/').at(-1),data:()=>records.get(path),ref:doc(path)});
 const doc=path=>({path,id:path.split('/').at(-1),get:async()=>snapshot(path)});
 const query={get:async()=>({docs:[...records.keys()].filter(path=>path.startsWith('membros/')&&records.get(path).empresaId==='tenant').map(snapshot),get size(){return this.docs.length;}})};
 const db={doc,collection:name=>({where:(field,op,value)=>{assert.equal(name,'membros');assert.equal(field,'empresaId');assert.equal(op,'==');assert.equal(value,'tenant');return {limit:number=>{assert.equal(number,401);return query;}};}}),
  runTransaction:async callback=>{const pending=[];
   const tx={get:async ref=>ref===query?query.get():snapshot(ref.path),update:(ref,data)=>pending.push([ref.path,data,true]),set:(ref,data,options)=>pending.push([ref.path,data,options?.merge]),create:(ref,data)=>pending.push([ref.path,data,false])};
   const result=await callback(tx);for(const [path,data,merge]of pending){assert(!Object.values(data).includes(undefined));records.set(path,merge?{...records.get(path),...data}:data);}return result;
  }};return {db,records,query};
}
test('suspend and reactivate tenant members while preserving independently disabled accounts and other companies',async()=>{
 const {db,records}=setup();
 await manageCompany(db,{action:'company.access',empresaId:'tenant',accessStatus:'suspended',reason:'Teste',expectedUpdatedAt:1},'platform-owner',now);
 assert.equal(records.get('membros/owner').ativo,false);assert.equal(records.get('membros/employee').ativo,false);assert.equal(records.get('membros/other').ativo,true);
 assert.equal(records.get(companyPath).email,'owner@example.com');assert.equal(records.get(companyPath).accessReason,'Teste');
 await manageCompany(db,{action:'company.access',empresaId:'tenant',accessStatus:'active',expectedUpdatedAt:now},'platform-owner',now+1);
 assert.equal(records.get('membros/owner').ativo,true);assert.equal(records.get('membros/employee').ativo,true);assert.equal(records.get('membros/disabled').ativo,false);
 assert.equal([...records.keys()].filter(path=>path.startsWith('plataforma_admin/audit/events/')).length,2);
});
test('dated trial creates in-app notices, keeps membership active and never bills; indefinite clears notices',async()=>{
 const {db,records}=setup();await manageCompany(db,{action:'trial.save',empresaId:'tenant',mode:'dated',endDate:'2026-11-15',expectedUpdatedAt:1},'platform-owner',now);
 assert.equal(records.get(subPath).trialEndDate,'2026-11-15');assert.equal(records.get(subPath).automaticBilling,false);assert.equal(records.get(subPath).status,'trial');
 assert.equal(records.get('membros/owner').ativo,true);assert.equal(records.get('membros/owner').avisoPlataforma.endDate,'2026-11-15');assert.equal(records.get('membros/other').avisoPlataforma,undefined);
 await manageCompany(db,{action:'trial.save',empresaId:'tenant',mode:'indefinite',expectedUpdatedAt:now},'platform-owner',now+1);
 assert.equal(records.get(subPath).trialEndsAt,null);assert.equal(records.get('membros/owner').avisoPlataforma,null);
});
test('invalid dates, stale company data and non-trial subscriptions cannot change access or trial',async()=>{
 for(const endDate of ['2026-02-30','2025-01-01','bad'])assert.throws(()=>trialConfiguration({mode:'dated',endDate},now));
 const {db,records}=setup();await assert.rejects(manageCompany(db,{action:'company.access',empresaId:'tenant',accessStatus:'suspended',expectedUpdatedAt:99},'admin',now),{status:409});
 assert.equal(records.get('membros/owner').ativo,true);
 records.set(subPath,{status:'active'});await assert.rejects(manageCompany(db,{action:'trial.save',empresaId:'tenant',mode:'indefinite'},'admin',now),{status:409});
 assert.equal(records.get(subPath).status,'active');
 await assert.rejects(companyDetail(db,'../other'),{status:400});
});
test('oversized membership cannot produce a partial suspension',async()=>{
 const {db,records,query}=setup();query.get=async()=>({size:401,docs:[]});
 await assert.rejects(manageCompany(db,{action:'company.access',empresaId:'tenant',accessStatus:'suspended'},'admin',now),{status:409});assert.equal(records.get('membros/owner').ativo,true);
});
test('details return company data and bounded membership without reading other tenants',async()=>{
 const {db}=setup();const result=await companyDetail(db,'tenant');assert.equal(result.company.name,'Empresa');assert.equal(result.members.length,3);assert(!result.members.some(m=>m.uid==='other'));
});
