import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {billingAccessWindow,billingAccessState,BILLING_ACCESS_DAY as DAY} from '../public/billing-access.mjs';
import {simulateBillingAccess,readBillingAccessProjection,projectPaidTestAccess} from '../Netlify/Funtions/lib/billing-access.mjs';
const now=Date.parse('2026-10-30T12:00:00Z');
function setup(){const records=new Map([['plataforma_admin/billing/companies/tenant',{name:'Empresa',updatedAt:1}]]),writes=[];const snap=path=>({exists:records.has(path),data:()=>records.get(path)});return {records,writes,db:{doc:path=>({path}),runTransaction:async fn=>{let writing=false;return fn({get:async ref=>{assert(!writing);return snap(ref.path)},set(ref,data,options){writing=true;records.set(ref.path,options?.merge?{...records.get(ref.path),...data}:data);writes.push(ref.path)},create(ref,data){writing=true;assert(!records.has(ref.path));records.set(ref.path,data);writes.push(ref.path)}})}}}}
test('exact boundaries enforce 5 days grace and then 30 days read-only',()=>{
 const p=billingAccessWindow(now);for(const [time,phase,read,write] of [[now-1,'active',true,true],[now,'grace',true,true],[now+5*DAY-1,'grace',true,true],[now+5*DAY,'readonly',true,false],[now+35*DAY-1,'readonly',true,false],[now+35*DAY,'settings',false,false]]){const s=billingAccessState(p,time);assert.equal(s.phase,phase);assert.equal(s.read,read);assert.equal(s.write,write)}
 assert.equal(billingAccessState(null).write,true);assert.equal(billingAccessState({enabled:true}).phase,'settings');
});
test('simulation changes only selected policy/company metadata and audit, with no plan or data deletion',async()=>{
 for(const phase of ['active','grace','readonly','settings','payment','off']){const s=setup();await simulateBillingAccess(s.db,{empresaId:'tenant',phase,expectedUpdatedAt:1},'owner',now);assert.equal(billingAccessState(s.records.get('empresas/tenant/acesso/plano'),now).phase,phase==='payment'||phase==='off'?'active':phase);assert(s.writes.every(p=>p==='empresas/tenant/acesso/plano'||p==='plataforma_admin/billing/companies/tenant'||p.startsWith('plataforma_admin/audit/')))}
});
test('stale and invalid changes or attempts to replace live policy are rejected',async()=>{
 for(const input of [{empresaId:'../bad',phase:'active',expectedUpdatedAt:1},{empresaId:'tenant',phase:'unknown',expectedUpdatedAt:1},{empresaId:'tenant',phase:'active',expectedUpdatedAt:2}]){const s=setup();await assert.rejects(simulateBillingAccess(s.db,input,'owner',now));assert.equal(s.writes.length,0)}const s=setup();s.records.set('empresas/tenant/acesso/plano',{enabled:true,mode:'live'});await assert.rejects(simulateBillingAccess(s.db,{empresaId:'tenant',phase:'off',expectedUpdatedAt:1},'owner',now));assert.equal(s.writes.length,0);
});
test('verified period restores enrolled test access but never overwrites live policy',async()=>{
 for(const mode of ['test','live']){const s=setup();s.records.set('empresas/tenant/acesso/plano',billingAccessWindow(now-36*DAY,{mode}));await s.db.runTransaction(async tx=>{const projection=await readBillingAccessProjection(tx,s.db,'tenant');projectPaidTestAccess(tx,projection,{id:'period',endsAt:now+30*DAY},now)});assert.equal(billingAccessState(s.records.get('empresas/tenant/acesso/plano'),now).phase,mode==='test'?'active':'settings')}
});
test('read-only click guard preserves navigation and exports but blocks new launches and form submissions',()=>{
 const handlers={},s={phase:'readonly',write:false,read:true,controlled:false};const parent={__smAccessState:()=>s,__smExigirEscrita:()=>{if(!s.write)throw Error('readonly')},addEventListener(){}};
 const context={parent,window:{},document:{addEventListener:(t,fn)=>handlers[t]=fn,getElementById:()=>null},setTimeout(){}};vm.createContext(context);vm.runInContext(readFileSync(new URL('../ui/billing-frame.js',import.meta.url),'utf8'),context);
 const click=text=>{let stopped=false;const control={textContent:text,getAttribute:()=>'',closest:()=>null,matches:()=>false};handlers.click({target:{closest:()=>control},preventDefault(){stopped=true},stopImmediatePropagation(){}});return stopped};assert.equal(click('Lançar peça'),true);assert.equal(click('Salvar madeira'),true);assert.equal(click('Apagar resumo'),true);assert.equal(click('Copiar resumo'),false);assert.equal(click('Gerar PDF'),false);let blocked=false;handlers.submit({preventDefault(){blocked=true},stopImmediatePropagation(){}});assert.equal(blocked,true);assert.throws(()=>context.exigirEscritaPlano());s.write=true;assert.doesNotThrow(()=>context.exigirEscritaPlano());
});
test('published rules artifact separates reads from writes and keeps policy administrator-only',()=>{
 const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');assert.equal(readFileSync(new URL('../public/regras-acesso-planos.txt',import.meta.url),'utf8'),rules);assert.match(rules,/request.time.toMillis\(\)/);assert.match(rules,/planoPermite\(empresaId, false\)/);assert.match(rules,/planoPermite\(empresaId, true\)/);assert.match(rules,/allow list, write: if false/);
});

test('build applies the same guards to desktop/mobile writes, queued operations and settings-only boot',async()=>{
 const {applyBillingAccess}=await import('../scripts/billing-access-build.mjs');const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.equal(applyBillingAccess(html),html);
 assert.ok(html.includes('BILLING_ACCESS_FRAME_V1'));assert.ok(html.includes('BILLING_ACCESS_SHELL_V1'));assert.ok(html.includes("if(window.__smAccessState().phase==='settings')"));assert.ok(html.includes('if(!acessoPlanoAtual().write)return;'));
});
test('read-only schema preparation never scans or migrates company documents',async()=>{
 const {prepareBudgetSchema}=await import('../Netlify/Funtions/lib/budget-schema.mjs');
 for(const prepared of [true,false]){let reads=0;const db={doc:()=>({get:async()=>{reads++;return {exists:prepared,data:()=>({version:1})}},set:()=>{throw Error('no writes allowed')}}),collection:()=>{throw Error('no full scan allowed')}};const result=await prepareBudgetSchema(db,'tenant','uid',now,{readOnly:true});assert.equal(result.ready,prepared);assert.equal(result.migrated,0);assert.equal(reads,1)}
});
