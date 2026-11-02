import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {prepareBudgetSchema} from '../Netlify/Funtions/lib/budget-schema.mjs';
import {PlatformError} from '../Netlify/Funtions/lib/platform.mjs';

function database(records){
 const paths=[],writes=[];let scanned=0,beforeTransaction=()=>{};
 const snap=path=>({exists:records.has(path),data:()=>records.get(path),ref:doc(path)});
 const doc=path=>({path,get:async()=>{paths.push(path);return snap(path);},set:async data=>{writes.push(path);records.set(path,data);}});
 const db={doc,collection:path=>({get:async()=>{scanned++;return {docs:[...records.keys()].filter(key=>key.startsWith(path+'/')).map(snap)};}}),
  runTransaction:async callback=>{beforeTransaction();return callback({get:async ref=>snap(ref.path),update:(ref,patch)=>{writes.push(ref.path);records.set(ref.path,{...records.get(ref.path),...patch});}});}};
 return {db,writes,paths,scanned:()=>scanned,onTransaction:fn=>{beforeTransaction=fn;}};
}
const base='empresas/tenant/dados/sm2_orcamento_itens/registros/';
test('migration preserves legacy active item, excluded rows, values and other tenants; repeated boot does not rescan',async()=>{
 const records=new Map([[base+'old',{quantidade:7,preco:123}], [base+'gone',{excluido:true,quantidade:5}], [base+'new',{excluido:false}],['empresas/other/dados/sm2_orcamento_itens/registros/x',{quantidade:9}]]);
 const s=database(records);assert.equal((await prepareBudgetSchema(s.db,'tenant','owner',10)).migrated,1);
 assert.deepEqual(records.get(base+'old'),{quantidade:7,preco:123,excluido:false});assert.equal(records.get(base+'gone').excluido,true);
 assert.deepEqual(records.get('empresas/other/dados/sm2_orcamento_itens/registros/x'),{quantidade:9});
 assert.equal(s.scanned(),1);await prepareBudgetSchema(s.db,'tenant','owner',11);assert.equal(s.scanned(),1);
 assert(s.writes.every(path=>path.startsWith('empresas/tenant/')));
});
test('a simultaneous exclusion is not undone by migration',async()=>{
 const records=new Map([[base+'old',{quantidade:7}]]),s=database(records);
 s.onTransaction(()=>records.set(base+'old',{quantidade:7,excluido:true}));
 assert.equal((await prepareBudgetSchema(s.db,'tenant','owner')).migrated,0);assert.equal(records.get(base+'old').excluido,true);
});
test('failed migration never marks the schema ready',async()=>{
 const records=new Map([[base+'old',{}]]),s=database(records);s.db.runTransaction=async()=>{throw Error('offline');};
 await assert.rejects(prepareBudgetSchema(s.db,'tenant','owner'),/offline/);assert(!records.has('empresas/tenant/dados/sm2_sync_status/registros/orcamento_schema_v704'));
});
function client(enabled,response={ready:true}){
 let calls=0,queries=0,identified;
 const reference={path:base.slice(0,-1)},user={uid:'uid',getIdToken:async()=>'token'};
 const context=vm.createContext({FILTRO_ORCAMENTO_V704:enabled,conexaoOnline:()=>true,boundV456:{uid:'uid'},AbortController,setTimeout,clearTimeout,
 parent:{__v470Runtime:()=>({auth:{currentUser:user},sdk:{where:(field,op,value)=>({field,op,value}),query:(ref,filter)=>{queries++;return {ref,filter};}}})},
 fetch:async()=>{calls++;if(response instanceof Error)throw response;return {ok:true,json:async()=>response};},COL:{orcamento:'budget'},db:{},collection:()=>reference,
 diagnosticoLeiturasV700:{identify:(query,path)=>{identified=path;return query;}}});
 vm.runInContext(readFileSync(new URL('../ui/budget-active.js',import.meta.url),'utf8'),context);
 return {context,reference,calls:()=>calls,queries:()=>queries,identified:()=>identified};
}
test('disabled rollout makes no preparation call and preserves complete query',async()=>{
 const s=client(false);await vm.runInContext('prepararOrcamentoAtivoV704()',s.context);assert.equal(s.calls(),0);
 assert.equal(vm.runInContext("consultaColecaoAtivaV704('budget')",s.context),s.reference);assert.equal(s.queries(),0);
});
test('only prepared budget query is filtered and remains identifiable in diagnostics',async()=>{
 const s=client(true);await vm.runInContext('prepararOrcamentoAtivoV704()',s.context);
 const query=vm.runInContext("consultaColecaoAtivaV704('budget')",s.context);assert.deepEqual(query.filter,{field:'excluido',op:'==',value:false});assert.equal(s.identified(),s.reference.path);
 assert.equal(vm.runInContext("consultaColecaoAtivaV704('stock')",s.context),s.reference);
});
test('preparation failure falls back to full query so legacy records never vanish silently',async()=>{
 const s=client(true,Error('unavailable'));await vm.runInContext('prepararOrcamentoAtivoV704()',s.context);
 assert.equal(vm.runInContext("consultaColecaoAtivaV704('budget')",s.context),s.reference);
});
test('endpoint remains disabled pending rules and derives tenant from membership instead of request data',async()=>{
 let membership={ativo:true,empresaId:'tenant'},calls=0;
 const configuration={enabled:false};
 const db={doc:path=>{assert.equal(path,'membros/uid');return {get:async()=>({exists:true,data:()=>membership})};}};
 const context=vm.createContext({configuration,PlatformError,authenticate:async()=>({db,uid:'uid'}),
  prepareBudgetSchema:async(database,tenant,uid)=>{calls++;assert.equal(database,db);assert.equal(tenant,'tenant');assert.equal(uid,'uid');return {ready:true};},
  json:(status,data)=>({status,data}),failure:error=>({status:error.status||500})});
 const source=readFileSync(new URL('../Netlify/Funtions/budget-schema.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default async function handler','async function handler');
 vm.runInContext(source,context);const handler=vm.runInContext('handler',context);
 const request={method:'POST',body:{empresaId:'other-company'}};
 assert.equal((await handler(request)).status,503);assert.equal(calls,0);
 configuration.enabled=true;assert.equal((await handler(request)).status,200);assert.equal(calls,1);
 membership={ativo:false,empresaId:'tenant'};assert.equal((await handler(request)).status,403);assert.equal(calls,1);
});
