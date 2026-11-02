import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../public/index.html', import.meta.url);
let html = readFileSync(file, 'utf8');
const marker = 'const TEMPLATE=';
const start = html.indexOf(marker) + marker.length;
if (start < marker.length || html[start] !== '"') throw new Error('Aplicação não encontrada.');
let end = start + 1;
for (; end < html.length; end++) {
  if (html[end] === '\\') { end++; continue; }
  if (html[end] === '"') { end++; break; }
}
let app = JSON.parse(html.slice(start, end));
if (!app.includes('const sincronismoListaToras =')) {
  const oldImport = 'import { iniciarCubagemToras } from "/toras.mjs";';
  const call = 'iniciarCubagemToras({storage:window.__v456Local,';
  if (!app.includes(oldImport) || !app.includes(call)) throw new Error('Integração da cubagem mudou. Revise o build.');
  app = app.replace(oldImport, 'import { iniciarCubagemToras, criarSincronismoToras } from "/toras.mjs";');
  const integration = `const sincronismoListaToras = criarSincronismoToras({
 observar:(receber,falhar)=>onSnapshot(collection(db,COL.servicos),{includeMetadataChanges:true},snap=>receber({
  docs:snap.docs.map(d=>({id:d.id,data:d.data()})),fromCache:snap.metadata.fromCache,hasPendingWrites:snap.metadata.hasPendingWrites
 }),falhar),
 pendencias:()=>offlineOps().filter(op=>op.nome===COL.servicos),
 gravar:(id,dados)=>{
  doc(db,COL.servicos,id);
  enfileirarOffline(COL.servicos,id,{...dados,atualizadoEm:Date.now()});
 },
 confirmar:()=>sincronizarOfflineOps()
});
iniciarCubagemToras({...sincronismoListaToras,storage:window.__v456Local,`;
  app = app.replace(call, integration);
}
html = html.slice(0, start) + JSON.stringify(app).replaceAll('</', '<\\/') + html.slice(end);
writeFileSync(file, html);
console.log('Sincronização da cubagem de toras preparada.');
