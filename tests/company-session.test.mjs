import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {companySession} from '../Netlify/Funtions/lib/company-session.mjs';
import {employeeCan,applyCompanyRole} from '../public/employee-permissions.mjs';
function dbFor(member,company){const records=new Map([['membros/owner',member],['empresas/tenant',company]]);return {doc:path=>({get:async()=>({exists:records.has(path)&&records.get(path)!==null,data:()=>records.get(path)})})};}
test('legacy responsible owner without papel is recognized by trusted company ownerUid',async()=>{
 const member={ativo:true,empresaId:'tenant'};assert.equal(employeeCan(member,'calculator'),false);const result=await companySession(dbFor(member,{ownerUid:'owner'}),{uid:'owner',email:'owner@example.com'});assert(result.roleContext.isCompanyOwner);assert.equal(result.member.papel,'admin');for(const area of ['calculator','catalog','stock','orders','production','loads'])assert(employeeCan(result.member,area,true));assert(!Object.hasOwn(member,'papel'));
});
test('platform email alone, wrong company UID and tenant IDs supplied by caller do not promote employees',async()=>{
 const member={ativo:true,empresaId:'tenant',papel:'employee',permissionsVersion:2,permissoes:{loads:{read:true,write:true}}};const result=await companySession(dbFor(member,{ownerUid:'someone-else'}),{uid:'owner',email:'antunezlorenzo160@gmail.com',empresaId:'foreign'});assert.equal(result.empresaId,'tenant');assert(!result.roleContext.isCompanyOwner);assert.equal(result.member.papel,'employee');assert(!employeeCan(result.member,'catalog',true));assert(employeeCan(result.member,'loads',true));
 const oldAdmin=await companySession(dbFor({...member,papel:'admin'},{ownerUid:'someone-else'}),{uid:'owner'});assert.equal(oldAdmin.member.papel,'employee');
});
test('trusted legacy admin fallback still works, inactive memberships remain blocked',async()=>{
 const admin=await companySession(dbFor({ativo:true,empresaId:'tenant',papel:'admin'},null),{uid:'owner'});assert(admin.roleContext.isCompanyOwner);await assert.rejects(companySession(dbFor({ativo:false,empresaId:'tenant'}, {ownerUid:'owner'}),{uid:'owner'}));
});
function root(){const records=new Map(),calls={reload:0};const c={window:{location:{reload:()=>calls.reload++}},document:{querySelector:()=>({})},localStorage:{getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)},structuredClone,setTimeout,clearTimeout,AbortController};vm.createContext(c);vm.runInContext(readFileSync(new URL('../public/employee-permissions.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../ui/employee-root.js',import.meta.url),'utf8'),c);return {c,records,calls};}
test('member listener does not downgrade a confirmed owner or cause reload loops when raw papel is missing',()=>{
 const {c,calls}=root();c.window.__smSetCompanyRoleContext({uid:'owner',empresaId:'tenant',isCompanyOwner:true,name:'Dono',email:'owner@example.com'},'owner','tenant');c.window.__smSetEmployeeMember({ativo:true,empresaId:'tenant',papel:'admin'},'owner');c.window.__smSetEmployeeMember({ativo:true,empresaId:'tenant'},'owner');assert.equal(c.window.__smEmployeeMember().papel,'admin');assert(c.window.__smEmployeeCan('catalog',true));assert.equal(calls.reload,0);
});
test('owner context is bound to UID/company and cannot be injected through member fields or reused after reassignment',()=>{
 const {c}=root();assert.throws(()=>c.window.__smSetCompanyRoleContext({uid:'owner',empresaId:'tenant',isCompanyOwner:true},'other','tenant'));c.window.__smSetCompanyRoleContext({uid:'owner',empresaId:'tenant',isCompanyOwner:true},'owner','tenant');c.window.__smSetEmployeeMember({ativo:true,empresaId:'different',isCompanyOwner:true},'owner');assert(!c.window.__smEmployeeCan('stock',true));c.window.__smSetEmployeeMember({ativo:false,empresaId:'tenant'},'owner');assert(!c.window.__smEmployeeCan('stock',true));
});
test('login resolves the owner from the authenticated endpoint and employee account switches clear the old proof',async()=>{
 const {c,records}=root(),raw={ativo:true,empresaId:'tenant'},session=await companySession(dbFor(raw,{ownerUid:'owner'}),{uid:'owner',email:'owner@example.com'});const runtime={auth:{currentUser:{uid:'owner',getIdToken:async()=> 'test-token'}}};c.window.__v470Runtime=()=>runtime;c.fetch=async(url,options)=>{assert.equal(url,'/.netlify/functions/company-session');assert.equal(options.headers.Authorization,'Bearer test-token');return {ok:true,json:async()=>session};};const member=await c.window.__smResolveCompanyMember(raw,'owner');c.window.__smSetEmployeeMember(member,'owner');assert(c.window.__smEmployeeCan('calculator',true));
 records.set('sm_vinculo_confirmado_offline_v1:worker',JSON.stringify({uid:'worker',empresaId:'tenant',ativo:true}));runtime.auth.currentUser.uid='worker';const worker={ativo:true,empresaId:'tenant',papel:'employee',permissionsVersion:2,permissoes:{loads:{read:true,write:true}}};c.fetch=async()=>({ok:true,json:async()=>({uid:'worker',empresaId:'tenant',roleContext:{uid:'worker',empresaId:'tenant',isCompanyOwner:false},member:worker})});await c.window.__smResolveCompanyMember(worker,'worker');c.window.__smSetEmployeeMember(worker,'worker');assert.equal(c.window.__smGetCompanyRoleContext().isCompanyOwner,false);assert(!c.window.__smEmployeeCan('catalog',true));assert.equal(JSON.parse(records.get('sm_vinculo_confirmado_offline_v1:worker')).companyRoleContext.isCompanyOwner,false);
});
test('session binding changes during resolution are rejected rather than using a cached owner',async()=>{
 const {c}=root(),raw={ativo:true,empresaId:'tenant'},session=await companySession(dbFor(raw,{ownerUid:'owner'}),{uid:'owner'});const runtime={auth:{currentUser:{uid:'owner',getIdToken:async()=> 'test-token'}}};c.window.__v470Runtime=()=>runtime;c.fetch=async()=>{runtime.auth.currentUser.uid='different';return {ok:true,json:async()=>session};};await assert.rejects(c.window.__smResolveCompanyMember(raw,'owner'));
});

test('explicit company owner UID prevails over an old employee role field',async()=>{const m={ativo:true,empresaId:'tenant',papel:'employee',permissionsVersion:2,permissoes:{}};const result=await companySession(dbFor(m,{ownerUid:'owner'}),{uid:'owner'});assert(result.roleContext.isCompanyOwner);assert(employeeCan(result.member,'catalog',true));});

test('standalone production watcher retains verified owner access and never applies another UID context',()=>{const raw={ativo:true,empresaId:'tenant'},proof={uid:'owner',empresaId:'tenant',isCompanyOwner:true};assert(employeeCan(applyCompanyRole(raw,proof,'owner'),'production',true));assert(!employeeCan(applyCompanyRole(raw,proof,'other'),'production',true));assert(!employeeCan(applyCompanyRole({...raw,ativo:false},proof,'owner'),'production',true));});

test('same employee permissions received with different Firestore key ordering do not reload the session',()=>{
 const {c,calls}=root();
 c.window.__smSetEmployeeMember({ativo:true,empresaId:'tenant',papel:'employee',permissionsVersion:2,permissoes:{calculator:{read:true,write:true},stock:{read:true,write:false}}},'worker');
 c.window.__smSetEmployeeMember({ativo:true,empresaId:'tenant',papel:'employee',permissionsVersion:2,permissoes:{stock:{write:false,read:true},calculator:{write:true,read:true}}},'worker');
 assert.equal(calls.reload,0);
 c.window.__smSetEmployeeMember({ativo:true,empresaId:'tenant',papel:'employee',permissionsVersion:2,permissoes:{calculator:{read:false,write:false},stock:{read:true,write:false}}},'worker');assert.equal(calls.reload,1);
});

test('disposing the generated frame stops listeners and preserves the authenticated account',async()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');const start=html.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 const app=JSON.parse(html.slice(start,end)),body=app.match(/window\.__v456Stop=async\(\)=>\{[\s\S]*?\n\};/)[0];let signouts=0,stops=0;
 const context={window:{},readyV456:true,authV456:{currentUser:{uid:'worker'}},signOut:async()=>signouts++,diagnosticoLeiturasV700:{stopAll:()=>stops++},encerrarObservadoresV428:()=>stops++,cancelarPerfilEmpresaV424:()=>stops++};vm.createContext(context);vm.runInContext(body,context);await context.window.__v456Stop();assert.equal(stops,3);assert.equal(signouts,0);assert.equal(context.authV456.currentUser.uid,'worker');assert.equal(context.readyV456,false);
});
