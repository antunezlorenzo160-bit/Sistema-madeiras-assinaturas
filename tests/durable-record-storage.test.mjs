import test from 'node:test';import assert from 'node:assert/strict';import {createRecordStorageV779,openRecordStoreV779} from '../public/durable-record-storage.mjs';import {packStorageV778,unpackStorageV778} from '../public/compact-storage.mjs';
function disk(){const data=new Map();return {data,fail:false,async read(scope){return structuredClone(data.get(scope)||null);},async write(scope,patch){if(this.fail)throw Error('disk failed');const value={...(data.get(scope)?.values||{})};for(const [key,entry]of Object.entries(patch.values)){if(entry===null)delete value[key];else value[key]=entry;}data.set(scope,{version:1,values:value});}};}
function local(initial={}){const map=new Map(Object.entries(initial));return {map,getItem:key=>map.get(key)??null,removeItem:key=>map.delete(key),setItem(){throw Error('localStorage full');},get length(){return map.size;},key:index=>[...map.keys()][index]??null,durable:true};}
function options(native,store,extra={}){return {native,base:native,prefix:'a:',store,decode:unpackStorageV778,...extra};}
const raw=JSON.stringify(Array.from({length:6000},(_,id)=>({id:'p'+id,quantidade:6,largura:10,comprimento:3,volume:1.8,madeira:'Eucalipto'})));
test('migrates6000packages and pending queue durably before removing only redundant local copies; restart works with localStorage full',async()=>{
 const native=local({'a:carregamentos_lancamentos_v1':packStorageV778(raw),'a:sm_offline_ops_v1':'[{"id":"pending"}]','b:carregamentos_lancamentos_v1':'other'}),store=disk();const write=store.write.bind(store);store.write=async(...args)=>{assert(native.getItem('a:carregamentos_lancamentos_v1'));return write(...args);};
 const adapter=await createRecordStorageV779(options(native,store));store.write=write;
 assert.equal(adapter.getItem('carregamentos_lancamentos_v1'),raw);assert.equal(adapter.getItem('sm_offline_ops_v1'),'[{"id":"pending"}]');assert.equal(native.getItem('a:carregamentos_lancamentos_v1'),null);assert.equal(native.getItem('b:carregamentos_lancamentos_v1'),'other');
 adapter.setItem('carregamentos_lancamentos_v1',raw+ ' ');await adapter.flush();
 const reboot=await createRecordStorageV779(options(native,store));assert.equal(reboot.getItem('carregamentos_lancamentos_v1'),raw+' ');assert.equal(JSON.parse(reboot.getItem('carregamentos_lancamentos_v1')).length,6000);
});
test('migration failure and conflicting copies preserve all original data rather than booting empty',async()=>{
 const native=local({'a:carregamentos_lancamentos_v1':raw}),store=disk();store.fail=true;
 await assert.rejects(createRecordStorageV779(options(native,store)),/disk failed/);assert.equal(native.getItem('a:carregamentos_lancamentos_v1'),raw);
 store.fail=false;store.data.set('a:',{version:1,values:{carregamentos_lancamentos_v1:'[]'}});
 await assert.rejects(createRecordStorageV779(options(native,store)),/versões diferentes/);assert.equal(native.getItem('a:carregamentos_lancamentos_v1'),raw);
});
test('batch waits for disk confirmation, preserves failed pending data, and retries without losing later revisions',async()=>{
 const native=local(),store=disk(),errors=[];let batching=true,release;
 const adapter=await createRecordStorageV779(options(native,store,{isBatching:()=>batching,onError:e=>errors.push(e)}));
 adapter.setItem('carregamentos_lancamentos_v1',raw);assert(adapter.pending);assert(!store.data.get('a:').values.carregamentos_lancamentos_v1);
 store.fail=true;await assert.rejects(adapter.flush(),/disk failed/);assert(adapter.pending);assert.equal(adapter.getItem('carregamentos_lancamentos_v1'),raw);assert.equal(errors.length,1);
 store.fail=false;const write=store.write.bind(store);let first=true;store.write=async(...args)=>{if(first){first=false;await new Promise(r=>release=r);}await write(...args);};
 const flushing=adapter.flush();adapter.setItem('carregamentos_lancamentos_v1',raw+' ');release();await flushing;
 assert(!adapter.pending);assert.equal(store.data.get('a:').values.carregamentos_lancamentos_v1,raw+' ');
});
test('different tabs write patches to independent keys and company scopes remain isolated',async()=>{
 const native=local(),store=disk(),a=await createRecordStorageV779(options(native,store,{isBatching:()=>true})),b=await createRecordStorageV779(options(native,store,{isBatching:()=>true}));
 a.setItem('carregamentos_lancamentos_v1',raw);b.setItem('orcamentos_guardados_v1','[{"id":"order"}]');await a.flush();await b.flush();
 assert.equal(store.data.get('a:').values.carregamentos_lancamentos_v1,raw);assert.equal(store.data.get('a:').values.orcamentos_guardados_v1,'[{"id":"order"}]');
 const other=await createRecordStorageV779(options(native,store,{prefix:'b:'}));assert.equal(other.getItem('carregamentos_lancamentos_v1'),null);
});
test('native adapter acknowledges per-key writes only on transaction completion and never rewrites unrelated keys',async()=>{
 const records=new Map();let exists=false,completions=0,puts=[];
 const factory={open(){const request={};queueMicrotask(()=>{request.result={objectStoreNames:{contains:()=>exists},createObjectStore(){exists=true;},transaction(){let pending=0,started=false;const staged=new Map(records);const tx={objectStore(){
  const complete=()=>{if(!pending&&started)queueMicrotask(()=>{records.clear();for(const [key,value]of staged)records.set(key,value);completions++;tx.oncomplete();});};
  const write=(kind,value,key)=>{started=true;pending++;const req={};queueMicrotask(()=>{const encoded=JSON.stringify(key);if(kind==='put'){staged.set(encoded,structuredClone(value));puts.push(key);}else staged.delete(encoded);req.onsuccess?.();pending--;complete();});return req;};
  return {put:(value,key)=>write('put',value,key),delete:key=>write('delete',null,key),openCursor(){started=true;pending++;const req={},rows=[...staged];let index=0;const next=()=>queueMicrotask(()=>{if(index<rows.length){const [key,value]=rows[index++];req.result={key:JSON.parse(key),value:structuredClone(value),continue:next};req.onsuccess();}else{req.result=null;req.onsuccess();pending--;complete();}});next();return req;}};
 },abort(){tx.onabort();}};return tx;}};if(!exists)request.onupgradeneeded();request.onsuccess();});return request;}};
 const store=await openRecordStoreV779(factory);await store.write('a:',{version:1,values:{carregamentos_lancamentos_v1:raw}});assert(completions>0);puts=[];
 await store.write('a:',{version:1,values:{sm_offline_ops_v1:'[]'}});assert(!puts.some(key=>key[1]==='carregamentos_lancamentos_v1'));
 const value=await store.read('a:');assert.equal(value.values.carregamentos_lancamentos_v1,raw);assert.equal(value.values.sm_offline_ops_v1,'[]');assert.equal(await store.read('b:'),null);
});

import vm from 'node:vm';import {readFileSync} from 'node:fs';
function built(){const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),start=html.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}return JSON.parse(html.slice(start,end));}
test('built app waits for storage before recovery/hydration and keeps recovery journal on failed durable projection',async()=>{
 const app=built();assert(app.includes('window.__smStorageReadyV779=(async()=>{'));assert(app.indexOf('window.__v456Local=scoped(l);window.__v456Session=scoped(s);')<app.indexOf('window.__v456Local=await createRecordStorageV779('));assert(app.includes('await window.__smStorageReadyV779;\nawait window.__smLoadRecoveryReady;'));assert(app.indexOf('window.__v456Local=await createRecordStorageV779(')<app.indexOf('window.__smLoadDeductionJournal=createLoadDeductionJournal('));assert(app.includes('await window.__v456Local.flush?.();'));assert(app.includes('async function persistirBlocoPacotes(){'));
 const a=app.indexOf('function createLoadDeductionJournal('),b=app.indexOf('function mergeLoadDeductionQueue(',a),context={};vm.createContext(context);vm.runInContext(app.slice(a,b),context);
 const native=local(),store=disk(),adapter=await createRecordStorageV779(options(native,store,{isBatching:()=>true}));let recovery=null;
 const journal=context.createLoadDeductionJournal(adapter,{journalStore:{get:async()=>recovery,put:async value=>{recovery=structuredClone(value);},remove:async()=>{recovery=null;}}});
 store.fail=true;await assert.rejects(journal.commit([['carregamentos_lancamentos_v1',raw]]),/disk failed/);assert(recovery);assert.equal(adapter.getItem('carregamentos_lancamentos_v1'),raw);
 store.fail=false;await journal.recover();assert.equal(recovery,null);assert.equal(store.data.get('a:').values.carregamentos_lancamentos_v1,raw);
});

test('repeated unchanged saves and clean flushes perform no additional disk transaction',async()=>{
 const native=local(),store=disk();let writes=0;const write=store.write.bind(store);store.write=async(...args)=>{writes++;return write(...args);};
 const adapter=await createRecordStorageV779(options(native,store,{isBatching:()=>true}));adapter.setItem('carregamentos_lancamentos_v1',raw);await adapter.flush();const baseline=writes;
 for(let i=0;i<20;i++){adapter.setItem('carregamentos_lancamentos_v1',raw);adapter.removeItem('movimentos_db_v1');await adapter.flush();}
 assert.equal(writes,baseline);assert.equal(adapter.pending,false);assert.equal(adapter.getItem('carregamentos_lancamentos_v1'),raw);
});
