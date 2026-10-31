import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadActor,isLoadDraft,loadContributors,employeeLoadWriteAllowed,LOAD_ADMIN_FIELDS} from '../public/load-access.mjs';
import {applyEmployeeAccess} from '../scripts/employee-access-build.mjs';
const actor={uid:'worker-uid',name:'Funcionário João'};
const draft={id:'piece',cargaFluxoV388:true,grupoCargaId:'group',cargaStatus:'montagem',cargaCriadaPorUid:actor.uid,cargaCriadaPorNome:actor.name,cargaFechadaEm:null,cargaBaixadaEm:null,quantidade:5,volume:.15,atualizadoEm:1};
test('real worker identity is used instead of simulated administrator, and legacy authors are not invented',()=>{
 assert.deepEqual(loadActor({ativo:true,papel:'employee',nome:actor.name},actor.uid),actor);assert.equal(loadContributors([draft]),actor.name);assert.equal(loadContributors([{cargaFechadaPor:'Administrador do sistema'}]),'Autor não registrado na versão anterior');assert.throws(()=>loadActor({ativo:false},actor.uid));
 const source=readFileSync(new URL('../scripts/employee-load-access-build.mjs',import.meta.url),'utf8');assert(source.includes('cargaCriadaPorUid:employeeLoadActor().uid'));assert(source.includes('cargaFechadaPorUid:employeeLoadActor().uid'));
});
test('employee can create a draft and keep it, but cannot close, settle, delete, forge author or change administrative fields',()=>{
 assert(employeeLoadWriteAllowed(null,draft,actor));assert(employeeLoadWriteAllowed(draft,{...draft,atualizadoEm:2},actor));assert(employeeLoadWriteAllowed(draft,{ocultoResumo:true},actor,'merge'));assert(!employeeLoadWriteAllowed(draft,null,actor,'delete'));
 assert(!employeeLoadWriteAllowed(null,{...draft,cargaCriadaPorUid:'owner'},actor));assert(!employeeLoadWriteAllowed(null,{...draft,cargaCriadaPorNome:'Administrador'},actor));
 for(const status of ['aguardando_conferencia','concluido']){assert(!employeeLoadWriteAllowed(draft,{...draft,cargaStatus:status},actor));assert(!employeeLoadWriteAllowed({...draft,cargaStatus:status},draft,actor));}
 for(const field of LOAD_ADMIN_FIELDS){assert(!employeeLoadWriteAllowed(null,{...draft,[field]:{x:1}},actor),field);assert(!employeeLoadWriteAllowed(draft,{...draft,[field]:'changed'},actor),field);}
 assert(!employeeLoadWriteAllowed(draft,{...draft,cargaCriadaPorUid:'other'},actor));
});
test('continuing a coworker draft preserves the creator; writes do not reattribute older items',()=>{const other={...draft,cargaCriadaPorUid:'other',cargaCriadaPorNome:'Maria'};assert(employeeLoadWriteAllowed(other,{...other,atualizadoEm:2},actor));assert.equal(loadContributors([other,draft]),'Maria, '+actor.name);});
function context(owner=false){const calls={queries:0},c={boundV456:{uid:actor.uid},parent:{__smEmployeeMember:()=>({ativo:true,papel:owner?'admin':'employee',nome:actor.name}),__smEmployeeCan:()=>true,__v470Runtime:()=>({sdk:{where:(field,op,value)=>({field,op,value}),query:(ref,filter)=>{calls.queries++;return {ref,filter};}}})},employeePath:r=>r.path,employeeEmptySnapshot:()=>({exists:()=>false,empty:true}),document:{},carregamentos:[draft]};vm.createContext(c);vm.runInContext(readFileSync(new URL('../public/load-access.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../ui/employee-loads.js',import.meta.url),'utf8'),c);return {c,calls};}
test('employee queries only montagem, owner reads unchanged, and closed cached documents are suppressed',()=>{
 for(const owner of [false,true]){const {c,calls}=context(owner),ref={type:'collection',path:'empresas/tenant/dados/sm2_carregamentos/registros'},query=c.employeeScopedReadReference(ref);assert.equal(calls.queries,owner?0:1);if(!owner){assert.equal(query.filter.field,'cargaStatus');assert.equal(query.filter.value,'montagem');assert.throws(()=>c.employeeRequireLoadAdmin());}else{assert.equal(query,ref);assert.doesNotThrow(()=>c.employeeRequireLoadAdmin());}}
 const {c}=context();assert.equal(c.employeeSanitizeLoadRead({path:'empresas/tenant/dados/sm2_carregamentos/registros/closed'},{exists:()=>true,data:()=>({...draft,cargaStatus:'concluido'})}).empty,true);
});
test('employee draft view renders only draft details and continue button, without original, PDF or document forms',()=>{
 function element(tag){return {tag,children:[],dataset:{},append(...nodes){this.children.push(...nodes);},replaceChildren(){this.children=[];}};}
 const {c}=context();c.document={createElement:element};c.carregamentos=[draft,{...draft,id:'closed',grupoCargaId:'closed',cargaStatus:'concluido',dadosClienteCargaV407:{documento:'private'}}];const host=element('div');c.renderEmployeeLoadDrafts(host);const content=JSON.stringify(host);assert(content.includes('Continuar carregamento'));assert(!content.includes('private'));assert(!content.includes('dadosClienteCarga'));assert(!content.includes('Gerar romaneio'));assert(!content.includes('PDF original'));assert(content.includes(actor.name));
});
test('Firestore rules keep employee writes draft-only and admin-only export handlers are guarded',()=>{
 const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');assert(rules.includes("resource.data.cargaStatus == 'montagem'"));assert(rules.includes('request.resource.data.cargaCriadaPorUid == request.auth.uid'));assert(rules.includes("hasOnly(['atualizadoEm', 'ocultoResumo'])"));const generic=rules.split('match /empresas/{empresaId}/dados/{colecao}')[1].split('function camposAdministrativosCarga')[0];assert(!generic.includes("'sm2_carregamentos'"));assert.equal(rules,readFileSync(new URL('../public/regras-acesso-planos.txt',import.meta.url),'utf8'));
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.equal(applyEmployeeAccess(html),html);assert(html.includes('EMPLOYEE_LOAD_DRAFTS_V1'));assert(html.includes('employeeRequireLoadAdmin();'));
});
test('generated calculator flow saves and continues an actual draft with authenticated attribution',async()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');const begin=html.indexOf('const TEMPLATE=')+15;let end=begin+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}const app=JSON.parse(html.slice(begin,end));
 const extract=signature=>{const start=app.indexOf(signature);assert(start>=0);const finish=app.indexOf('\n  }',start)+4;assert(finish>start);return app.slice(start,finish);};
 const server=new Map(),stored=new Map(),field={value:'Destino',scrollIntoView(){}};
 const c={window:{__v456Local:{setItem:(k,v)=>stored.set(k,v)},statusEfetivoCargaV589:x=>x.cargaStatus},carregamentos:[],lancamentos:[],COL:{cargas:'loads'},STORAGE:{lancamentos:'summary'},sessaoCargaAtual:'group',producaoCalcPendente:null,adicionarReferenciaPesoV420:x=>({...x}),employeeLoadActor:()=>actor,employeeRequireLoadDraftWrite(){},crypto:{randomUUID:()=> 'next-group'},save(){},sincronizarOfflineOps:async()=>{},atualizarFluxoCargaV388(){},salvarContador(){},document:{getElementById:()=>field,querySelector:()=>null},setTimeout(){},alert(){},pcAtivarAba(){}};
 c.enfileirarOffline=(collection,id,data,mode='set')=>{assert(employeeLoadWriteAllowed(server.get(id),data,actor,mode));server.set(id,structuredClone(data));};c.itensCargaAtualV388=()=>c.carregamentos.filter(x=>x.grupoCargaId===c.sessaoCargaAtual&&isLoadDraft(x));c.itensMontagemGrupoV397=id=>c.carregamentos.filter(x=>x.grupoCargaId===id&&isLoadDraft(x));
 vm.createContext(c);for(const signature of ['async function salvarPreCargaSemBaixaV388(item,estoqueOrigem){','function guardarCarregamentoMontagemV594({avisar=true}={}){','function continuarCarregamentoV397(gid){'])vm.runInContext(extract(signature),c);
 await c.salvarPreCargaSemBaixaV388({id:'new-piece',tipoMedida:'m3',quantidade:5,volume:.0375},'estoque1');assert.equal(server.get('new-piece').cargaCriadaPorUid,actor.uid);assert.equal(server.get('new-piece').cargaCriadaPorNome,actor.name);assert.equal(server.get('new-piece').cargaStatus,'montagem');
 assert(c.guardarCarregamentoMontagemV594({avisar:false}));assert.equal(c.lancamentos.length,0);assert.equal(c.sessaoCargaAtual,'next-group');assert.equal(server.get('new-piece').cargaStatus,'montagem');c.continuarCarregamentoV397('group');assert.equal(c.sessaoCargaAtual,'group');assert.equal(c.lancamentos[0].id,'new-piece');assert.equal(server.get('new-piece').cargaCriadaPorUid,actor.uid);
});
