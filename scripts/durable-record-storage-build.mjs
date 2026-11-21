import {readFileSync} from 'node:fs';
export function applyDurableRecordStorageV779(app){
 if(app.includes('// DURABLE_RECORD_STORAGE_V779'))return app;
 const replace=(from,to)=>{if(!app.includes(from)||app.indexOf(from)!==app.lastIndexOf(from))throw Error('Durable record storage anchor changed: '+from.slice(0,70));app=app.replace(from,()=>to);};
 const pure=readFileSync(new URL('../public/durable-record-storage.mjs',import.meta.url),'utf8').replaceAll('export ','');
 replace('(()=>{\n const ctx=parent.__v456Context();','window.__smStorageReadyV779=(async()=>{\n const ctx=parent.__v456Context();');
 replace('window.__v456Local=scoped(l);window.__v456Session=scoped(s);',`// DURABLE_RECORD_STORAGE_V779\n${pure}\nwindow.__v456Local=scoped(l);window.__v456Session=scoped(s);\nwindow.__v456Local=await createRecordStorageV779({native:l,base:window.__v456Local,prefix,store:await openRecordStoreV779(window.indexedDB),decode:unpackStorageV778,project:(key,value)=>parent.__smEmployeeStorageValue(key,value),isBatching:()=>window.__smPacketBatchActiveV779===true,onError:error=>{window.__smRecordStorageFailureV779=String(error?.message||error);window.dispatchEvent(new CustomEvent('sm-record-storage-failure-v779'));},onSaved:()=>{window.__smRecordStorageFailureV779='';}});window.__v456Session=scoped(s);`);
 replace('await window.__smLoadRecoveryReady;','await window.__smStorageReadyV779;\nawait window.__smLoadRecoveryReady;');
 replace('async function lancar(){',"async function lancar(){\n if(window.__smRecordStorageFailureV779)return alert('A gravação offline está pendente. Preserve esta página e tente salvar o lote sem lançar novamente.');");
 replace('  if(lotePacotesEmCurso)return;\n  if(!conexaoOnline())return;', '  if(lotePacotesEmCurso)return;\n  await window.__v456Local.flush?.();\n  if(!conexaoOnline())return;');
 // Journal cleanup and server acknowledgement wait for durable local projection.
 replace('  for(const [key,value]of pending.entries)storage.setItem(key,value);\n  await journalStore.remove();','  for(const [key,value]of pending.entries)storage.setItem(key,value);\n  await storage.flush?.();\n  await journalStore.remove();');
 replace('   for(const [key,value]of pending.entries)storage.setItem(key,value);\n   await journalStore.remove();','   for(const [key,value]of pending.entries)storage.setItem(key,value);\n   await storage.flush?.();\n   await journalStore.remove();');
 replace('      salvarOfflineOps(restantes);','      salvarOfflineOps(restantes);\n      await window.__v456Local.flush?.();');
 replace('const boundV456=window.__v456Bound;',"window.addEventListener('sm-record-storage-failure-v779',()=>{packetPersistenceFailureV778();atualizarStatusSync('erro','Falha na gravação offline; preserve esta página e tente salvar sem lançar novamente');});\nconst boundV456=window.__v456Bound;");
 return app;
}
