// Preserve queue order and the special transactional semantics of budget writes.
export function offlineSyncBatchesV794(operations,budgetCollection,{maxWrites=100,maxBytes=1500000}={}){
 if(!Number.isSafeInteger(maxWrites)||maxWrites<1||maxWrites>400)throw Error('Limite de lote inválido.');
 const groups=[];let current=[],bytes=0;const finish=()=>{if(current.length)groups.push({budget:false,operations:current});current=[];bytes=0;};
 for(const op of operations){
  if(op.nome===budgetCollection&&op.modo!=='delete'){finish();groups.push({budget:true,operations:[op]});continue;}
  const size=new TextEncoder().encode(JSON.stringify(op)).length+256;
  if(current.length&&(current.length>=maxWrites||bytes+size>maxBytes))finish();
  current.push(op);bytes+=size;
 }
 finish();return groups;
}
export function acknowledgeOfflineBatchV794(current,confirmed){
 const versions=new Set(confirmed.map(op=>op.chave+'|'+String(op.revisao||op.criadoEm||0)));
 return current.filter(op=>!versions.has(op.chave+'|'+String(op.revisao||op.criadoEm||0)));
}
export function summarizeOfflineQueueV794(queue){
 const groups=new Map();for(const op of queue){const key=String(op.nome)+'|'+String(op.modo);if(!groups.has(key))groups.set(key,{collection:String(op.nome),mode:String(op.modo),count:0});groups.get(key).count++;}return [...groups.values()];
}
