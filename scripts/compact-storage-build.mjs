import {readFileSync} from 'node:fs';
export function applyCompactStorageV778(app){
 if(app.includes('// COMPACT_STORAGE_V778'))return app;
 const replace=(from,to)=>{if(!app.includes(from)||app.indexOf(from)!==app.lastIndexOf(from))throw Error('Compact storage anchor changed: '+from.slice(0,70));app=app.replace(from,()=>to);};
 const helpers=readFileSync(new URL('../public/compact-storage.mjs',import.meta.url),'utf8').replaceAll('export ','');
 replace(' function scoped(storage){',' // COMPACT_STORAGE_V778\n'+helpers+'\n function scoped(storage){');
 replace("durable?storage.getItem(prefix+String(k)):(fallback.get(String(k))??null)","durable?unpackStorageV778(storage.getItem(prefix+String(k))):(fallback.get(String(k))??null)");
 replace("if(durable)storage.setItem(prefix+String(k),String(v));else fallback.set(String(k),String(v));","if(durable)writeCompactStorageV778(storage,prefix+String(k),String(v),prefix);else fallback.set(String(k),String(v));");
 replace('JSON.parse(ev.newValue)',"JSON.parse(window.__v456Local.getItem(STORAGE.lancamentos)||'[]')");
 replace('async function lancar(){',"async function lancar(){\n if(window.__smPacketPersistencePendingV778)return alert('Salve o lote interrompido antes de lançar novamente. Use Tentar salvar sem lançar novamente.');");
 return app;
}
