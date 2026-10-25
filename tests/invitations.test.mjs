import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvitation,redeemInvitation,invitationRef } from '../Netlify/Funtions/lib/invitations.mjs';
import authorizedInvitations from '../Netlify/Funtions/lib/owner-invitations.json' with { type:'json' };

function database(){
 const records=new Map();let queue=Promise.resolve();
 const db={doc:path=>({path,create:async data=>{assert(!records.has(path));records.set(path,data);}}),runTransaction:callback=>{
  const promise=queue.then(async()=>{
   const writes=[];
   const tx={get:async ref=>({exists:records.has(ref.path),data:()=>records.get(ref.path)}),create:(ref,data)=>writes.push(['create',ref,data]),update:(ref,data)=>writes.push(['update',ref,data])};
   const result=await callback(tx);
   for(const [mode,ref]of writes)if(mode==='create'&&records.has(ref.path))throw Error('already exists');
   for(const [mode,ref,data]of writes)records.set(ref.path,mode==='create'?data:{...records.get(ref.path),...data});
   return result;
  });queue=promise.catch(()=>{});return promise;
 }};return {db,records};
}
const identity={uid:'new-user',email:'owner@example.com',emailVerified:true};
test('owner invitation stores a hash and provisions a separate company with indefinite free access atomically',async()=>{
 const {db,records}=database();const result=await createInvitation(db,{name:' Nova empresa ',email:'OWNER@example.com'},'platform-owner',1);
 assert(!JSON.stringify([...records]).includes(result.token));
 const registered=await redeemInvitation(db,result.token,identity,2);assert.equal(registered.empresaId,result.empresaId);
 const member=records.get('membros/new-user');assert.equal(member.empresaId,result.empresaId);assert.equal(member.ativo,true);
 const sub=records.get('plataforma_admin/billing/subscriptions/'+result.empresaId);
 assert.equal(sub.status,'trial');assert.equal(sub.trialEndsAt,null);assert.equal(sub.automaticBilling,false);assert.equal(sub.planId,null);
 assert.equal(records.get(`empresas/${result.empresaId}/dados/sm2_empresas_perfis_dev/registros/${result.empresaId}`).nome,'Nova empresa');
 assert.deepEqual(await redeemInvitation(db,result.token,identity,3),registered);
 assert.equal(records.size,6);
});
test('unverified or different email, reused invitation and existing membership cannot grant or replace access',async()=>{
 const {db,records}=database();const {token}=await createInvitation(db,{name:'Empresa',email:identity.email},'owner');
 await assert.rejects(redeemInvitation(db,token,{...identity,emailVerified:false}),/Confirme/);
 await assert.rejects(redeemInvitation(db,token,{...identity,email:'other@example.com'}),/e-mail/);
 records.set('membros/new-user',{empresaId:'original',ativo:true});
 await assert.rejects(redeemInvitation(db,token,identity),/já possui/);assert.equal(records.size,2);
 assert.equal(records.get('membros/new-user').empresaId,'original');records.delete('membros/new-user');
 await redeemInvitation(db,token,identity);
 await assert.rejects(redeemInvitation(db,token,{...identity,uid:'another-user'}),/utilizado/);
 assert(!records.has('membros/another-user'));
});
test('separate invitations generate separate tenants and reject malformed inputs',async()=>{
 const {db}=database();const a=await createInvitation(db,{name:'A',email:'a@example.com'},'owner');const b=await createInvitation(db,{name:'B',email:'b@example.com'},'owner');
 assert.notEqual(a.empresaId,b.empresaId);assert.notEqual(a.token,b.token);
 assert.throws(()=>invitationRef(db,'../../membros'),/inválido/);
 await assert.rejects(createInvitation(db,{name:'',email:'wrong'},'owner'),/nome/);
});
test('preapproved forwarded link is claimed once by a verified account, requires a company name and persists its claim',async()=>{
 const {db,records}=database();const {token}=await createInvitation(db,{},'owner');const ref=invitationRef(db,token),key=ref.path.split('/').at(-1);
 authorizedInvitations[key]=records.get(ref.path);records.delete(ref.path);
 try{
  await assert.rejects(redeemInvitation(db,token,identity,4),/nome/);assert.equal(records.size,0);
  await Promise.all([redeemInvitation(db,token,identity,5,{name:'Empresa convidada'}),redeemInvitation(db,token,identity,5,{name:'Empresa convidada'})]);
  assert.equal(records.size,6);assert.equal(records.get(ref.path).status,'redeemed');
  assert.equal(records.get(ref.path).email,identity.email);
  await assert.rejects(redeemInvitation(db,token,{...identity,uid:'someone',email:'someone@example.com'},6,{name:'Outra empresa'}),/e-mail/);
  assert(!records.has('membros/someone'));
 }finally{delete authorizedInvitations[key];}
});
