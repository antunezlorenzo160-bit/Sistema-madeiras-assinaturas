import {readFileSync} from 'node:fs';
export function applyOfflineSyncBatchesV794(app){
 if(app.includes('// OFFLINE_SYNC_BATCHES_V794'))return app;
 const start=app.indexOf('let offlineSyncPromiseV396=null;'),end=app.indexOf("\nwindow.addEventListener('online'",start);
 if(start<0||end<0)throw Error('Sincronização pendente mudou.');
 const pure=readFileSync(new URL('../public/offline-sync-batches.mjs',import.meta.url),'utf8').replaceAll('export ',''),ui=readFileSync(new URL('../ui/offline-sync-batches.js',import.meta.url),'utf8');
 return app.slice(0,start)+pure+'\n'+ui+app.slice(end);
}
