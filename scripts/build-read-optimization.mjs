import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export function buildReadOptimization(input=new URL('../public/index.html',import.meta.url)){
const root=new URL('../',import.meta.url),file=input instanceof URL?input:pathToFileURL(resolve(input));
let html=readFileSync(file,'utf8');
const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
let end=start+1;
for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
let app=JSON.parse(html.slice(start,end));
if(!app.includes('// READ_OPTIMIZATION_V700')){
  function replaceOnce(before,after){
    if(!app.includes(before)||app.indexOf(before)!==app.lastIndexOf(before))throw Error('Trecho da revisão de leituras mudou: '+before.slice(0,75));
    app=app.replace(before,()=>after);
  }
  const declaration=/const \{ initializeFirestore,[^\n]+\} = parent\.__v470Runtime\(\)\.sdk;/;
  const match=app.match(declaration);if(!match)throw Error('Importação do Firestore não encontrada.');
  let sdk=match[0];
  for(const [name,alias]of [['getDocs','rawGetDocsV700'],['getDocsFromServer','rawGetDocsServerV700'],['getDocFromServer','rawGetDocServerV700'],['getCountFromServer','rawGetCountServerV700'],['onSnapshot','rawOnSnapshotV700']])sdk=sdk.replace(new RegExp('\\b'+name+'(?=,)'),name+': '+alias);
  const helper=readFileSync(new URL('ui/read-diagnostics.js',root),'utf8');
  const setup=`\n// READ_OPTIMIZATION_V700\n${helper}\nconst diagnosticoLeiturasV700=criarDiagnosticoLeiturasV700({cacheMode:()=>parent.__smFirestoreCacheMode||'desconhecido'});
const getDocs=diagnosticoLeiturasV700.wrapRead('consultaComCache',rawGetDocsV700);
const getDocsFromServer=diagnosticoLeiturasV700.wrapRead('consultaServidor',rawGetDocsServerV700);
const getDocFromServer=diagnosticoLeiturasV700.wrapRead('documentoServidor',rawGetDocServerV700);
const getCountFromServer=diagnosticoLeiturasV700.wrapRead('contagemServidor',rawGetCountServerV700);
const onSnapshot=diagnosticoLeiturasV700.wrapSnapshot(rawOnSnapshotV700);
const confirmacoesPendentesV700=new Set();
window.diagnosticoLeiturasV700=()=>diagnosticoLeiturasV700.report();\n`;
  app=app.replace(declaration,()=>sdk+setup);
  replaceOnce('function temOperacoesPendentesV428(nome){return offlineOps().some(op=>op.nome===nome)}',
    'function temOperacoesPendentesV428(nome){return confirmacoesPendentesV700.has(nome)||offlineOps().some(op=>op.nome===nome)}');
  const a=app.indexOf('function abrirObservadoresV428(){'),b=app.indexOf('\nlet orcMutationVersion=',a);
  if(a<0||b<0)throw Error('Observadores não encontrados.');
  const original=app.slice(a,b);
  let observers=original.replace('if(snap.metadata.fromCache||snap.metadata.hasPendingWrites)return;',
    'if(snap.metadata.hasPendingWrites){confirmacoesPendentesV700.add(nome);return;}\n      if(snap.metadata.fromCache)return;\n      const confirmouPendenciaV700=confirmacoesPendentesV700.delete(nome);');
  observers=observers.replace('if(!primeiraResposta && snap.docChanges({includeMetadataChanges:false}).length===0)return;',
    'if(!primeiraResposta && !confirmouPendenciaV700 && snap.docChanges({includeMetadataChanges:false}).length===0)return;');
  if(observers===original||!observers.includes('const confirmouPendenciaV700='))throw Error('Confirmação de escrita não encontrada.');
  app=app.slice(0,a)+observers+app.slice(b);
  const fullRead=/try\{\s*const confirmado=await getDocsFromServer\(collection\(db,COL\.madeiras\)\);\s*dadosEscutadosV428\.set\('madeiras',confirmado\);\s*agendarAplicacaoV428\(\);\s*\}catch\(e\)\{console\.warn\('V457 atualização após envio',e\);\}/;
  if(!fullRead.test(app))throw Error('Releitura integral do catálogo não encontrada.');
  app=app.replace(fullRead,'// O observador já confirma os documentos alterados, sem reler o catálogo.\n        agendarAplicacaoV428();');
  replaceOnce('window.__v456Stop=async()=>{\n readyV456=false;',
    'window.__v456Stop=async()=>{\n readyV456=false;\n diagnosticoLeiturasV700.stopAll();');
  replaceOnce('function encerrarObservadoresV428(){\n  sessaoSyncV428++;',
    'function encerrarObservadoresV428(){\n  sessaoSyncV428++;\n  confirmacoesPendentesV700.clear();');
  replaceOnce('parent.__v456Ready({empresaId:empresaV456,uid:boundV456.uid,persistente:window.__v456Local.durable});',
    'diagnosticoLeiturasV700.mount(document);\nparent.__v456Ready({empresaId:empresaV456,uid:boundV456.uid,persistente:window.__v456Local.durable});');
}
html=html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
html=html.replace('localCache:f.persistentLocalCache({tabManager:f.persistentMultipleTabManager()})});}',
  'localCache:f.persistentLocalCache({tabManager:f.persistentMultipleTabManager()})});window.__smFirestoreCacheMode="persistent";}');
html=html.replace('localCache:f.memoryLocalCache()});}',
  'localCache:f.memoryLocalCache()});window.__smFirestoreCacheMode="memory";}');
writeFileSync(file,html);
console.log('Releitura integral redundante removida; confirmação por observador e medição local preparadas.');

}
if(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildReadOptimization(process.argv[2]);
