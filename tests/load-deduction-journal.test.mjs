import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadDeductionJournal,createIndexedDBLoadJournal,mergeLoadDeductionQueue} from '../public/load-deduction-journal.mjs';
function disk(){return {value:null,async get(){return structuredClone(this.value);},async put(value){if(this.value)throw Error('Pending journal');this.value=structuredClone(value);},async remove(){this.value=null;}};}
function local(limit=Infinity){const values=new Map();let count=0,failAt=0;return {values,fail(n){count=0;failAt=n;},getItem:k=>values.get(k)??null,setItem(k,v){if(++count===failAt||[...values].reduce((sum,[key,value])=>sum+(key===k?0:value.length),0)+v.length>limit)throw Object.assign(Error('Storage quota'),{name:'QuotaExceededError'});values.set(k,v);},removeItem:k=>values.delete(k)};}
test('journal no longer duplicates full snapshots into near-full localStorage',async()=>{
 const storage=local(2500),store=disk(),entries=[];
 for(let i=0;i<6;i++){storage.setItem('key'+i,'a'.repeat(300));entries.push(['key'+i,'b'.repeat(301)]);}
 await createLoadDeductionJournal(storage,{journalStore:store}).commit(entries);
 for(const [k,v]of entries)assert.equal(storage.getItem(k),v);
 assert.equal(storage.getItem('sm_load_deduction_journal_v1'),null);assert.equal(store.value,null);
});
test('interruption at every local projection retains durable recovery until restart completes it',async()=>{
 const entries=[['stock','15'],['load','concluded'],['movement','5'],['queue','pending']];
 for(let stop=1;stop<=entries.length;stop++){
  const storage=local(),store=disk();storage.setItem('stock','20');storage.fail(stop);
  await assert.rejects(createLoadDeductionJournal(storage,{journalStore:store}).commit(entries));assert(store.value);
  storage.fail(0);const reboot=createLoadDeductionJournal(storage,{journalStore:store});await reboot.recover();
  for(const [key,value]of entries)assert.equal(storage.getItem(key),value);
  assert.equal(await reboot.recover(),false);
 }
});
test('journal write failure cannot alter stock and cleanup failure remains recoverable',async()=>{
 const storage=local(),store=disk();storage.setItem('stock','20');store.put=async()=>{throw Error('IndexedDB write failed');};
 await assert.rejects(createLoadDeductionJournal(storage,{journalStore:store}).commit([['stock','15']]));assert.equal(storage.getItem('stock'),'20');
 const next=disk();next.remove=async()=>{throw Error('Cleanup failed');};
 await assert.rejects(createLoadDeductionJournal(storage,{journalStore:next}).commit([['stock','15']]));assert(next.value);
 next.remove=async()=>{next.value=null;};await createLoadDeductionJournal(storage,{journalStore:next}).recover();assert.equal(storage.getItem('stock'),'15');
});
test('legacy journal is moved durably before removal and storage replay',async()=>{
 const storage=local(),store=disk(),key='sm_load_deduction_journal_v1';
 storage.setItem(key,JSON.stringify({version:1,entries:[['stock','15']]}));
 const put=store.put.bind(store);store.put=async value=>{assert(storage.getItem(key));await put(value);};
 await createLoadDeductionJournal(storage,{journalStore:store}).recover();assert.equal(storage.getItem('stock'),'15');assert.equal(storage.getItem(key),null);
 storage.setItem(key,JSON.stringify({version:1,entries:[['stock','10']]}));store.put=async()=>{throw Error('disk failed');};
 await assert.rejects(createLoadDeductionJournal(storage,{journalStore:store}).recover());assert(storage.getItem(key));assert.equal(storage.getItem('stock'),'15');
});
test('overlapping commits cannot replace the pending operation',async()=>{
 const storage=local(),store=disk();let release;
 store.put=async value=>{store.value=value;await new Promise(resolve=>{release=resolve;});};
 const journal=createLoadDeductionJournal(storage,{journalStore:store}),pending=journal.commit([['stock','15']]);
 while(!release)await Promise.resolve();
 await assert.rejects(journal.commit([['stock','10']]),/Aguarde/);release();await pending;assert.equal(storage.getItem('stock'),'15');
});
test('queue checkpoint preserves unrelated operations and replaces each document once',()=>{
 let id=0;const prior=[{chave:'stock|a',nome:'stock',id:'a',obj:{quantity:20},modo:'set'},{chave:'clients|x',nome:'clients',id:'x',obj:{name:'Client'},modo:'set'}];
 const next=mergeLoadDeductionQueue(prior,[{nome:'stock',id:'a',obj:{quantity:15},modo:'set'}],100,()=>String(++id));
 assert.equal(next.length,2);assert.equal(next[0].obj.quantity,15);assert.deepEqual(next[1],prior[1]);
});
test('native IndexedDB adapter waits for transaction completion and isolates company scopes',async()=>{
 const values=new Map();let exists=false,completed=0;
 const factory={open(){const request={};queueMicrotask(()=>{request.result={objectStoreNames:{contains:()=>exists},createObjectStore(){exists=true;},transaction(){const tx={objectStore(){const send=(kind,value,key)=>{const req={};queueMicrotask(()=>{if(kind==='add'&&values.has(key)){req.error=Error('ConstraintError');tx.error=req.error;tx.onabort();return;}if(kind==='add')values.set(key,structuredClone(value));if(kind==='delete')values.delete(key);req.result=kind==='get'?structuredClone(values.get(key)):undefined;req.onsuccess();queueMicrotask(()=>{completed++;tx.oncomplete();});});return req;};return {get:key=>send('get',null,key),add:(value,key)=>send('add',value,key),delete:key=>send('delete',null,key)};}};return tx;}};if(!exists)request.onupgradeneeded();request.onsuccess();});return request;}};
 const a=createIndexedDBLoadJournal(factory,'company-a'),b=createIndexedDBLoadJournal(factory,'company-b');
 await a.put({version:2,entries:[['stock','15']]});assert(completed>0);
 assert.equal(await b.get(),null);assert.equal((await a.get()).entries[0][1],'15');
 await assert.rejects(a.put({version:2,entries:[]}));await a.remove();assert.equal(await a.get(),null);
});
