import test from 'node:test';import assert from 'node:assert/strict';
import {packStorageV778,unpackStorageV778,writeCompactStorageV778,compactStorageScopeV778} from '../public/compact-storage.mjs';
const row=i=>({id:'pkg-'+i,madeira:'Eucalipto 🌳 São João',tipoMedida:'m2',quantidade:6,largura:10,comprimento:3,volume:1.8,grupoCargaId:'load-abc',contadoComoPacote:true,preco:156,valor:280.8,producaoPendenteV388:null});
test('large package loads round-trip with exact IDs, numbers, Unicode and more than50% space reduction',()=>{
 const raw=JSON.stringify(Array.from({length:6000},(_,i)=>row(i))),packed=packStorageV778(raw);
 assert(packed.startsWith('~SM778~'));assert(packed.length<raw.length*.5);assert.equal(unpackStorageV778(packed),raw);assert.deepEqual(JSON.parse(unpackStorageV778(packed)).at(-1),row(5999));
});
test('dictionary resets and UTF-8 round-trip on mixed repetitive/random data; small values and old JSON remain readable',()=>{
 let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const raw=JSON.stringify(Array.from({length:6000},(_,i)=>({...row(i),note:Array.from({length:80},()=>String.fromCharCode(32+random()%95)).join('')})));
 const packed=packStorageV778(raw);assert(packed.startsWith('~SM778~'));assert.equal(unpackStorageV778(packed),raw);
 for(const value of [null,'[]','{"a":1}','true','123','Olá'])assert.equal(unpackStorageV778(value),value);
 assert.equal(packStorageV778('small'),'small');assert.throws(()=>unpackStorageV778('~SM778~bad'));
 const damaged=packed.slice(0,-1)+String.fromCharCode(packed.charCodeAt(packed.length-1)^1);assert.throws(()=>unpackStorageV778(damaged));
});
function storage(values,limit){const map=new Map(Object.entries(values));return {map,get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:key=>map.get(key)??null,setItem(key,value){const size=[...map].filter(([k])=>k!==key).reduce((n,[k,v])=>n+(k.length+v.length)*2,0)+(key.length+value.length)*2;if(size>limit)throw Object.assign(Error('full'),{name:'QuotaExceededError'});map.set(key,value);},removeItem(key){if(key.endsWith('__probe')){map.delete(key);return;}assert.fail('must never delete records');}};}
test('full localStorage compacts only this company scope and preserves old queue, old loads and new pending records',()=>{
 const prefix='company:A:',raw=JSON.stringify(Array.from({length:780},(_,i)=>row(i))),pending=JSON.stringify(Array.from({length:780},(_,i)=>({id:'op-'+i,obj:row(i)})));
 const s=storage({[prefix+'old']:raw,[prefix+'queue']:pending,'company:B:records':'untouched'},(raw.length+pending.length)*2+200);
 writeCompactStorageV778(s,prefix+'new',raw,prefix);
 assert.equal(unpackStorageV778(s.getItem(prefix+'old')),raw);assert.equal(unpackStorageV778(s.getItem(prefix+'queue')),pending);assert.equal(unpackStorageV778(s.getItem(prefix+'new')),raw);assert.equal(s.getItem('company:B:records'),'untouched');assert.equal(s.length,4);
 compactStorageScopeV778(s,prefix);assert.equal(unpackStorageV778(s.getItem(prefix+'queue')),pending);
});
test('unrecoverable quota failure keeps prior values and reports failure rather than volatile fallback or deleting data',()=>{
 const s=storage({'a:old':'[1,2,3]','b:other':'keep'},50);
 assert.throws(()=>writeCompactStorageV778(s,'a:new',JSON.stringify(Array.from({length:1000},(_,i)=>row(i))),'a:'),/full/);
 assert.equal(s.getItem('a:old'),'[1,2,3]');assert.equal(s.getItem('b:other'),'keep');assert.equal(s.getItem('a:new'),null);
});

import vm from 'node:vm';import {readFileSync} from 'node:fs';
test('built scoped storage exposes ordinary JSON to consumers and decodes new cross-tab values through its public reader',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),start=html.indexOf('const TEMPLATE=')+15;let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 const app=JSON.parse(html.slice(start,end)),a=app.indexOf(' function scoped(storage){'),b=app.indexOf(' let l=null,s=null;',a);assert(a>0&&b>a);
 const s=storage({'tenant:old':'[{"id":"legacy"}]','other:row':'separate'},5*1024*1024),c={TextEncoder,TextDecoder,storage:s,parent:{__smEmployeeStorageValue:(key,value)=>value}};
 vm.createContext(c);vm.runInContext(readFileSync(new URL('../public/compact-storage.mjs',import.meta.url),'utf8').replaceAll('export ','')+'\nconst prefix="tenant:";\n'+app.slice(a,b)+'\nglobalThis.scopedStore=scoped(storage);',c);
 const raw=JSON.stringify(Array.from({length:780},(_,i)=>row(i)));c.scopedStore.setItem('load',raw);
 assert(s.getItem('tenant:load').startsWith('~SM778~'));assert.equal(c.scopedStore.getItem('load'),raw);assert.equal(c.scopedStore.getItem('old'),'[{"id":"legacy"}]');assert.equal(c.scopedStore.getItem('missing'),null);assert.equal(c.scopedStore.length,2);assert.equal(s.getItem('other:row'),'separate');
 assert(app.includes("JSON.parse(window.__v456Local.getItem(STORAGE.lancamentos)||'[]')"));
});
