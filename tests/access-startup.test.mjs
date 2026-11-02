import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {applyAccessStartupDeadline} from '../scripts/access-startup-build.mjs';
import {withAccessDeadline} from '../public/access-startup-deadline.mjs';
function setup({blocked=false,missing=false,uid='owner',settings=false}={}){
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 const built=applyAccessStartupDeadline(html);assert.equal(applyAccessStartupDeadline(built),built);
 const start=built.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<built.length;end++){if(built[end]==='\\'){end++;continue;}if(built[end]==='"'){end++;break;}}
 const shell=built.slice(end),a=shell.indexOf('async function lerVinculoOffline('),b=shell.indexOf('window.__smValidarVinculoOffline=',a),c=shell.indexOf('async function abrirSessaoV492('),d=shell.indexOf('\nfunction falhaEntradaV492',c);
 const nodes=new Map(),record={uid,empresaId:'tenant',ativo:true,verificadoEm:100,bloqueado:blocked,employeeMember:{empresaId:'tenant',ativo:true,papel:'admin'},planoAcesso:{enabled:false},companyRoleContext:{uid,empresaId:'tenant',isCompanyOwner:true}};
 const context={auth:{currentUser:{uid:'owner'}},sdk:{doc:(...x)=>x,getDocFromServer:()=>new Promise(()=>{}),getDocsFromServer:()=>new Promise(()=>{}),getDocFromCache:()=>{context.cacheReads++;return new Promise(()=>{});}},db:{},probeDb:{},navigator:{onLine:true},expected:{},context:null,credentials:null,frame:null,busy:true,etapaEntradaOffline:'',primeiroErroInterface:null,empresaValidaV702:x=>x==='tenant',chaveVinculoOffline:x=>'member:'+x,localStorage:{getItem:()=>missing?null:JSON.stringify(record)},erroDeRedeOffline:e=>e.code==='deadline-exceeded',revogarVinculoOffline(){throw Error('Timeout must not revoke confirmed membership');},guardarVinculoOffline(){throw Error('Timeout must not write new membership');},window:{__smSetAccessPolicy(p){context.policy=p;},__smSetCompanyRoleContext(){},__smSetEmployeeMember(m){context.member=m;},__smEmployeeMember:()=>context.member,__smBeginAccessSession(){},__smAccessState:()=>({phase:settings?'settings':'active'}),__smRenderRestricted(){context.restricted=true;},innerHeight:700},out:{textContent:''},TEMPLATE:'<html></html>',document:{createElement:()=>({style:{}})},$:id=>{if(!nodes.has(id))nodes.set(id,{style:{},append(){}});return nodes.get(id);},setTimeout:(fn,ms)=>{context.waits.push(ms);return setTimeout(fn,Math.min(ms,10));},clearTimeout};
 context.cacheReads=0;context.waits=[];vm.createContext(context);
 vm.runInContext(withAccessDeadline.toString()+'\nlet vinculoParaInterfaceV9=null;\n'+shell.slice(a,b)+'\n'+shell.slice(c,d),context);
 return context;
}
test('slow online company checks open only the previously confirmed authenticated company offline',async()=>{
 const c=setup();await c.abrirSessaoV492(true);assert.equal(c.context.uid,'owner');assert.equal(c.context.empresaId,'tenant');assert.equal(c.context.offline,true);assert.equal(c.member.ativo,true);assert(c.frame);
});
test('missing, blocked and foreign confirmed memberships never open the application',async()=>{
 for(const options of [{missing:true},{blocked:true},{uid:'someone'}]){const c=setup(options);await assert.rejects(c.abrirSessaoV492(true));assert.equal(c.frame,null);}
});
test('expired saved access remains restricted after the network deadline',async()=>{
 const c=setup({settings:true});await c.abrirSessaoV492(true);assert(c.restricted);assert.equal(c.frame,null);
});
test('deadline preserves authorization errors instead of treating them as network problems',async()=>{
 const error=Object.assign(Error('denied'),{code:'permission-denied'});await assert.rejects(withAccessDeadline(()=>Promise.reject(error),'read',10),e=>e===error);
});

test('iframe reuses the just-validated member once without reading IndexedDB again',async()=>{
 const c=setup();await c.abrirSessaoV492(true);const reads=c.cacheReads;assert.equal(reads,2);
 await c.lerVinculoOffline('owner');assert.equal(c.cacheReads,reads);
 await c.lerVinculoOffline('owner');assert.equal(c.cacheReads,reads+2);
});
test('one-time handoff never skips a changed or blocked local identity',async()=>{
 const c=setup();await c.abrirSessaoV492(true);
 c.localStorage.getItem=()=>JSON.stringify({uid:'owner',empresaId:'tenant',ativo:true,bloqueado:true});
 await assert.rejects(c.lerVinculoOffline('owner'));
 c.auth.currentUser.uid='other';await assert.rejects(c.lerVinculoOffline('owner'));
});

test('slow network uses three-second deadline and parallel local reads use one second',async()=>{
 const c=setup();await c.abrirSessaoV492(true);
 assert.equal(c.waits.filter(ms=>ms===3000).length,1);
 assert.equal(c.waits.filter(ms=>ms===1000).length,2);
 assert(!c.waits.includes(6000));
 assert.equal(c.context.offline,true);
});
