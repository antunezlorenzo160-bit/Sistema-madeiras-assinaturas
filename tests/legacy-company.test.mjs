import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recoverLegacyCompany} from '../Netlify/Funtions/lib/legacy-company.mjs';
function fixture(member={ativo:true,empresaId:'old'},company={nome:'Minha madeireira'},billing=null){
 const records=new Map([['membros/me',member],['empresas/old',company],['plataforma_admin/billing/companies/old',billing]]),writes=[];
 const db={doc:path=>({path}),runTransaction:async callback=>callback({get:async ref=>({exists:!!records.get(ref.path),data:()=>records.get(ref.path)}),set:(...v)=>writes.push(v),update:(...v)=>writes.push(v),create:(...v)=>writes.push(v)})};return {db,writes};
}
const identity={uid:'me',email:'owner@example.com'};
test('inspection is read only and ignores supplied tenant and UID',async()=>{const {db,writes}=fixture();const result=await recoverLegacyCompany(db,identity,{action:'company.legacy.inspect',empresaId:'other',uid:'other'});assert.equal(result.empresaId,'old');assert.equal(result.name,'Minha madeireira');assert.equal(writes.length,0);});
test('recovery links existing company, own member and platform index without touching business or payment records',async()=>{const {db,writes}=fixture();await recoverLegacyCompany(db,identity,{action:'company.legacy.recover',expectedEmpresaId:'old'},123);assert.deepEqual(writes.slice(0,3).map(w=>w[0].path),['empresas/old','membros/me','plataforma_admin/billing/companies/old']);assert.deepEqual(writes[1][1],{papel:'admin'});assert.equal(writes[0][1].ownerUid,'me');assert.equal(writes.length,4);});
test('conflicting root or platform owner, inactive membership and employee grants are refused before writing',async()=>{for(const f of [fixture(undefined,{ownerUid:'other'}),fixture(undefined,undefined,{ownerUid:'other'}),fixture({ativo:false,empresaId:'old'}),fixture({ativo:true,empresaId:'old',papel:'employee',permissionsVersion:2})]){await assert.rejects(recoverLegacyCompany(f.db,identity,{action:'company.legacy.recover',expectedEmpresaId:'old'}));assert.equal(f.writes.length,0);}});
test('changed membership company cannot be recovered by a stale request',async()=>{const {db,writes}=fixture();await assert.rejects(recoverLegacyCompany(db,identity,{action:'company.legacy.recover',expectedEmpresaId:'different'}));assert.equal(writes.length,0);});
