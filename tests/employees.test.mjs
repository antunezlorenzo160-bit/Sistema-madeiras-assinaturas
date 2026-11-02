import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {employeeCan,employeeCollectionCan,normalizePermissions,permissionPreset} from '../public/employee-permissions.mjs';
import {createEmployeeInvite,redeemEmployeeInvite,updateEmployee,listEmployees,cancelEmployeeInvite} from '../Netlify/Funtions/lib/employees.mjs';
import {employeeRulesReady,requireEmployeeRules} from '../Netlify/Funtions/lib/employee-rules.mjs';
import {applyEmployeeAccess} from '../scripts/employee-access-build.mjs';
const now=Date.parse('2026-10-31T12:00:00Z'),owner={uid:'owner',email:'owner@example.com',emailVerified:true},seller={uid:'seller',email:'seller@example.com',emailVerified:true};
function setup(){
 const records=new Map([['membros/owner',{empresaId:'tenant',ativo:true,papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}]]),writes=[];
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>{let key,value,max=1000;const q={where(k,op,v){key=k;value=v;return q;},limit(n){max=n;return q;},async get(){const docs=[...records].filter(([p,d])=>p.startsWith(path+'/')&&p.slice(path.length+1).indexOf('/')<0&&(!key||d[key]===value)).slice(0,max).map(([p])=>({...snap(p),id:p.split('/').at(-1)}));return {docs,size:docs.length};}};return q;},async runTransaction(fn){let writing=false;const pending=[];const tx={get:async ref=>{assert.equal(writing,false,'reads must precede writes');return snap(ref.path);},create(ref,d){assert(!records.has(ref.path));writing=true;pending.push([ref.path,d]);},set(ref,d,opts){writing=true;pending.push([ref.path,opts?.merge?{...records.get(ref.path),...d}:d]);},update(ref,d){assert(records.has(ref.path));writing=true;pending.push([ref.path,{...records.get(ref.path),...d}]);}};const result=await fn(tx);for(const [p,d] of pending){records.set(p,d);writes.push(p);}return result;}};
 function snap(path){return {exists:records.has(path),data:()=>structuredClone(records.get(path))};}return {db,records,writes};
}
test('permissions reject unknown fields, fail closed for employees and preserve owner access',()=>{
 for(const input of [{admin:{read:true}},{stock:{read:'yes'}},{stock:{write:true,extra:true}},[]])assert.throws(()=>normalizePermissions(input));
 const permissions=normalizePermissions({stock:{read:true}}),m={ativo:true,papel:'employee',permissionsVersion:1,permissoes:permissions};assert(employeeCan(m,'stock'));assert(!employeeCan(m,'stock',true));assert(!employeeCan(m,'budgets'));assert(!employeeCan({...m,ativo:false},'stock'));assert(!employeeCan({ativo:true,papel:'employee'},'stock'));assert(employeeCan({ativo:true,papel:'admin'},'stock',true));assert(!employeeCollectionCan(m,'unrecognized'));assert(!employeeCollectionCan(m,'sm2_empresas_perfis_dev',true));
 const preset=permissionPreset();assert(!preset.catalog.read&&preset.services.read);assert(!preset.stock.read);assert(employeeCollectionCan({...m,permissoes:preset},'sm2_orcamento_itens',true));
});
test('invitation is tenant-bound, hashed, email verified, single-use and issues no admin access',async()=>{
 const s=setup(),invite=await createEmployeeInvite(s.db,owner,{name:'Vendedor',email:seller.email,permissions:permissionPreset(),role:'Venda'},now);
 const path=`empresas/tenant/convitesFuncionarios/${createHash('sha256').update(invite.token).digest('hex')}`;assert(s.records.has(path));assert(!JSON.stringify([...s.records]).includes(invite.token));
 await assert.rejects(redeemEmployeeInvite(s.db,{...seller,emailVerified:false},{...invite},now));await assert.rejects(redeemEmployeeInvite(s.db,{...seller,email:'other@example.com'},{...invite},now));
 await redeemEmployeeInvite(s.db,seller,invite,now);const m=s.records.get('membros/seller');assert.equal(m.papel,'employee');assert.equal(m.funcao,'Venda');assert(!employeeCan(m,'stock'));await redeemEmployeeInvite(s.db,seller,invite,now);await assert.rejects(redeemEmployeeInvite(s.db,{...seller,uid:'other'},invite,now));
});
test('owner can grant stock view without stock write, changes use revisions and cannot cross tenants or grant admin',async()=>{
 const s=setup();s.records.set('membros/seller',{empresaId:'tenant',papel:'employee',ativo:true,permissionsRevision:1,permissoes:permissionPreset()});
 await updateEmployee(s.db,owner,{uid:'seller',revision:1,active:true,permissions:{stock:{read:true}}},now);const m=s.records.get('membros/seller');assert(employeeCan(m,'stock'));assert(!employeeCan(m,'stock',true));assert.equal(m.papel,'employee');
 await assert.rejects(updateEmployee(s.db,owner,{uid:'seller',revision:1,active:true,permissions:{}},now));await assert.rejects(updateEmployee(s.db,seller,{uid:'owner',revision:0,active:false,permissions:{}},now));
 s.records.set('membros/foreign',{empresaId:'other',papel:'employee'});await assert.rejects(updateEmployee(s.db,owner,{uid:'foreign',revision:0,active:true,permissions:{}},now));
 await updateEmployee(s.db,owner,{uid:'seller',revision:2,active:false,permissions:{}},now);assert(!s.records.get('membros/seller').ativo);
});
test('expired/cancelled invitations and existing memberships cannot be used; no company data is touched',async()=>{
 for(const action of ['expire','cancel','existing']){const s=setup(),i=await createEmployeeInvite(s.db,owner,{name:'Venda',email:seller.email,permissions:{}},now);if(action==='cancel'){const id=[...s.records.keys()].find(p=>p.includes('convitesFuncionarios')).split('/').at(-1);await cancelEmployeeInvite(s.db,owner,{id},now);}if(action==='existing')s.records.set('membros/seller',{empresaId:'other',ativo:true});await assert.rejects(redeemEmployeeInvite(s.db,seller,i,action==='expire'?now+8*86400000:now));assert(s.writes.every(p=>!p.includes('/dados/')));}
});
test('company suspension, expired plan and platform-blocked employee cannot be bypassed',async()=>{
 const s=setup();s.records.set('empresas/tenant/acesso/plano',{enabled:true});await assert.rejects(createEmployeeInvite(s.db,owner,{name:'Venda',email:seller.email,permissions:{}},now));s.records.delete('empresas/tenant/acesso/plano');s.records.set('membros/seller',{empresaId:'tenant',papel:'employee',ativo:false,suspensoPelaPlataforma:true,permissionsRevision:1});await assert.rejects(updateEmployee(s.db,owner,{uid:'seller',revision:1,active:true,permissions:{}},now));
});
test('owner listing contains no tokens and cannot be requested by an employee',async()=>{const s=setup();await createEmployeeInvite(s.db,owner,{name:'Venda',email:seller.email,permissions:{}},now);const result=await listEmployees(s.db,owner);assert.equal(result.invites[0].email,seller.email);assert(!Object.hasOwn(result.invites[0],'token'));await assert.rejects(listEmployees(s.db,seller));});
test('invites require exact deployed rules; old rules or unavailable verifier cannot unlock them',async()=>{
 const source=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');const request=async url=>({ok:true,json:async()=>url.includes('/releases/')?{rulesetName:'projects/estoque-madeiras-cc4d7/rulesets/test'}:{source:{files:[{content:source}]}}});assert(await employeeRulesReady({accessToken:'test',request}));const old=async url=>({ok:true,json:async()=>url.includes('/releases/')?{rulesetName:'projects/estoque-madeiras-cc4d7/rulesets/old'}:{source:{files:[{content:'allow read, write: if true;'}]}}});assert(!await employeeRulesReady({accessToken:'test',request:old}));await assert.rejects(requireEmployeeRules({accessToken:'test',request:old}));
 assert.equal(source,readFileSync(new URL('../public/regras-acesso-planos.txt',import.meta.url),'utf8'));assert.match(source,/areaPermite\(empresaId, 'budgets', true\)/);assert.match(source,/allow list, create, update, delete: if false/);
});
test('client read guards do not issue denied reads/listeners and write guards reject stock writes',async()=>{
 const nodes={};const c={boundV456:{uid:'seller'},empresaV456:'tenant',parent:{__smEmployeeCollectionCan:(name,write)=>name==='sm2_madeiras'&&!write,__smEmployeeMember:()=>({papel:'employee'})},document:{addEventListener(){},createElement:()=>({}),head:{append(){}},getElementById:()=>null},window:{addEventListener(){}},setTimeout(){},queueMicrotask};vm.createContext(c);vm.runInContext(readFileSync(new URL('../public/load-access.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../ui/employee-loads.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8'),c);let calls=0;const stock={path:'empresas/tenant/dados/sm2_estoque1/registros'},catalog={path:'empresas/tenant/dados/sm2_madeiras/registros'};const read=c.employeeRead(async()=>{calls++;return {size:2};});assert.equal((await read(stock)).size,0);assert.equal(calls,0);assert.equal((await read(catalog)).size,2);assert.equal(calls,1);assert.throws(()=>c.employeeAssertWrite({...stock,path:stock.path+'/id'}));let snapshots=0;c.employeeSnapshot(()=>{throw Error('denied listener opened')})(stock,()=>snapshots++);await new Promise(resolve=>queueMicrotask(resolve));assert.equal(snapshots,1);
});
test('built app validates membership before data and guards user caches, queued writes and navigation',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.equal(applyEmployeeAccess(html),html);assert.match(html,/EMPLOYEE_ACCESS_SHELL_V1/);assert.match(html,/EMPLOYEE_ACCESS_FRAME_V1/);assert.match(html,/employeeStorageValue|__smEmployeeStorageValue/);assert.match(html,/employeeAssertWrite/);
});
