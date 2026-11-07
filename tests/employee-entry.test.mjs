import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEmployeeEntry} from '../public/funcionario/access-flow.mjs';
const user={uid:'staff',getIdToken:async fresh=>{assert.equal(fresh,true);return 'verified-id-token';}};
const active={uid:'staff',empresaId:'wood-company',member:{ativo:true,empresaId:'wood-company',papel:'employee'}};
const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
test('active employee signs in without redeeming an invitation, with or without the old invite',async()=>{
 for(const invite of [{},{token:'old-invite',empresaId:'wood-company'}]){
  const calls=[];const result=await resolveEmployeeEntry({user,...invite,request:async(url,options)=>{calls.push(url);assert.equal(options.headers.Authorization,'Bearer verified-id-token');return response(200,active);}});
  assert.equal(result.existing,true);assert.deepEqual(calls,['/.netlify/functions/company-session']);
 }
});
test('new employee still activates through the protected invitation endpoint',async()=>{
 const calls=[];const result=await resolveEmployeeEntry({user,token:'invite-secret',empresaId:'wood-company',request:async(url,options)=>{calls.push(url);if(calls.length===1)return response(403,{error:'Conta sem empresa ativa.'});assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{action:'invite.redeem',token:'invite-secret',empresaId:'wood-company'});return response(200,{ok:true});}});
 assert.equal(result.existing,false);assert.equal(calls.length,2);
});
test('no active membership and no invite cannot open access',async()=>{
 let calls=0;await assert.rejects(resolveEmployeeEntry({user,request:async()=>{calls++;return response(403,{});}}),/convite completo/);assert.equal(calls,1);
});
test('other company, inactive or mismatched server identity cannot be accepted',async()=>{
 for(const data of [active,{...active,uid:'someone-else'},{...active,member:{...active.member,ativo:false}},{...active,member:{...active.member,empresaId:'another'}}]){
  let calls=0;await assert.rejects(resolveEmployeeEntry({user,token:'invite',empresaId:'different-company',request:async()=>{calls++;return response(200,data);}}));assert.equal(calls,1);
 }
});
test('session failure never attempts activation; rules rejection is preserved for new invitations',async()=>{
 for(const status of [401,500,503]){let calls=0;await assert.rejects(resolveEmployeeEntry({user,token:'invite',empresaId:'wood-company',request:async()=>{calls++;return response(status,{error:'Servidor indisponível'});}}),/Servidor indisponível/);assert.equal(calls,1);}
 let calls=0;await assert.rejects(resolveEmployeeEntry({user,token:'invite',empresaId:'wood-company',request:async()=>++calls===1?response(403,{}):response(409,{error:'Configuração de acesso não confirmada'})}),/Configuração de acesso não confirmada/);assert.equal(calls,2);
});
