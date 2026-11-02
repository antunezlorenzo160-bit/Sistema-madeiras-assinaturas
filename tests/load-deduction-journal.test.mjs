import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadDeductionJournal,mergeLoadDeductionQueue} from '../public/load-deduction-journal.mjs';
function storage(){const values=new Map();let count=0,failAt=0;return {values,fail(n){count=0;failAt=n;},getItem:k=>values.get(k)??null,setItem(k,v){if(++count===failAt)throw Error('simulated crash');values.set(k,v);},removeItem(k){if(++count===failAt)throw Error('simulated crash');values.delete(k);}};}
test('interruption at each storage write recovers the complete stock/load/movement/queue state',()=>{
 const entries=[['stock','15'],['load','concluded'],['movement','5'],['queue','pending']];
 for(let stop=1;stop<=entries.length+2;stop++){
  const s=storage();s.values.set('stock','20');s.fail(stop);
  assert.throws(()=>createLoadDeductionJournal(s).commit(entries));s.fail(0);
  const reboot=createLoadDeductionJournal(s);reboot.recover();
  if(stop===1){assert.equal(s.getItem('stock'),'20');assert.equal(s.getItem('load'),null);}
  else for(const [key,value]of entries)assert.equal(s.getItem(key),value);
  assert.equal(reboot.recover(),false);
 }
});
test('pending recovery failure preserves journal and successful retry is idempotent',()=>{
 const s=storage();s.fail(2);assert.throws(()=>createLoadDeductionJournal(s).commit([['stock','15']]));
 s.fail(1);assert.throws(()=>createLoadDeductionJournal(s).recover());assert(s.getItem('sm_load_deduction_journal_v1'));
 s.fail(0);createLoadDeductionJournal(s).recover();assert.equal(s.getItem('stock'),'15');
});
test('queue checkpoint preserves unrelated operations and replaces each document once',()=>{
 let id=0;
 const prior=[{chave:'stock|a',nome:'stock',id:'a',obj:{quantity:20},modo:'set'},{chave:'clients|x',nome:'clients',id:'x',obj:{name:'Client'},modo:'set'}];
 const next=mergeLoadDeductionQueue(prior,[{nome:'stock',id:'a',obj:{quantity:15},modo:'set'},{nome:'movements',id:'m',obj:{quantity:5},modo:'set'}],100,()=>String(++id));
 assert.equal(next.length,3);assert.equal(next.find(x=>x.chave==='stock|a').obj.quantity,15);assert.deepEqual(next.find(x=>x.chave==='clients|x'),prior[1]);
});
