import assert from 'node:assert/strict';
export function financeDbV804(initial=[]){
 const records=new Map([['membros/owner',{ativo:true,empresaId:'tenant',papel:'admin'}],['empresas/tenant',{ownerUid:'owner'}],...initial]),writes=[],versions=new Map();
 const snap=path=>({id:path.split('/').at(-1),exists:records.has(path),data:()=>structuredClone(records.get(path))});
 const query=(path,filters=[],maximum=Infinity)=>({path,isQuery:true,where:(k,op,v)=>query(path,[...filters,[k,op,v]],maximum),orderBy:()=>query(path,filters,maximum),limit:n=>query(path,filters,n),get:async()=>({docs:[...records.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')&&filters.every(([k,op,v])=>op==='=='?records.get(p)[k]===v:op==='>='?records.get(p)[k]>=v:op==='<='?records.get(p)[k]<=v:false)).slice(0,maximum).map(snap)})});
 const db={doc:path=>({path,get:async()=>snap(path)}),collection:path=>query(path),runTransaction:async fn=>{db.before?.();for(let attempt=0;attempt<10;attempt++){
  const read=new Map(),pending=[];let writing=false;
  const result=await fn({get:async ref=>{assert(!writing,'reads precede writes');if(ref.isQuery)return ref.get();read.set(ref.path,versions.get(ref.path)||0);return snap(ref.path);},create:(ref,value)=>{writing=true;pending.push({path:ref.path,value,create:true});},set:(ref,value)=>{writing=true;pending.push({path:ref.path,value});}});
  if([...read].some(([path,version])=>(versions.get(path)||0)!==version))continue;
  for(const row of pending)if(row.create&&records.has(row.path))throw Error('Document already exists');
  for(const row of pending){records.set(row.path,structuredClone(row.value));versions.set(row.path,(versions.get(row.path)||0)+1);writes.push(row.path);}return result;
 }throw Error('transaction conflict');}};
 return {db,records,writes,identity:{uid:'owner',emailVerified:true}};
}
