import test from 'node:test';import assert from 'node:assert/strict';
import {removePlanDuplicates} from '../Netlify/Funtions/lib/plan-duplicates.mjs';
function setup(used=[]){
 const records=[{id:'original',data:()=>({name:'Completo',amountCents:19990,interval:'monthly',updatedAt:1})},{id:'copy',data:()=>({name:'Completo',amountCents:19990,interval:'monthly',updatedAt:2})},{id:'annual',data:()=>({name:'Completo Anual',amountCents:200000,interval:'yearly'})}];records.forEach(p=>p.ref={id:p.id});
 const deleted=[],audit=[];let writing=false;
 const collection=path=>({path,limit(){return this;},where(field,op,id){return {path,id,limit(){return this;}};}});
 const db={collection,doc:path=>({path}),runTransaction:async fn=>fn({get:async query=>{assert(!writing);return query.path.endsWith('/plans')?{docs:records,size:records.length}:{size:used.includes(query.id)?1:0};},delete:ref=>{writing=true;deleted.push(ref.id);},create:(ref,data)=>{writing=true;audit.push(data);}})};
 return {db,deleted,audit};
}
test('unused duplicate is removed while original and annual are preserved',async()=>{const s=setup(['original']);assert.equal((await removePlanDuplicates(s.db,'copy','owner')).removed,1);assert.deepEqual(s.deleted,['copy']);assert.equal(s.audit[0].keptPlanId,'original');});
test('referenced copy is retained even when older original is unused',async()=>{const s=setup(['copy']);await removePlanDuplicates(s.db,'original','owner');assert.deepEqual(s.deleted,['original']);});
test('no referenced plans can be deleted and retry after cleanup is harmless',async()=>{const s=setup(['original','copy']);await assert.rejects(removePlanDuplicates(s.db,'copy','owner'),/Nenhum foi excluído/);assert.deepEqual(s.deleted,[]);const annual=setup();assert.equal((await removePlanDuplicates(annual.db,'annual','owner')).removed,0);assert.deepEqual(annual.deleted,[]);});
