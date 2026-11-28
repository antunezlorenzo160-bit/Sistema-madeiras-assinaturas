import {readFileSync} from 'node:fs';
export function applyLoadRecordIntegrityV791(app){
 if(app.includes('// LOAD_RECORD_INTEGRITY_V791'))return app;
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Load integrity anchor changed: '+a.slice(0,80));app=app.replace(a,()=>b);};
 const pure=readFileSync(new URL('../public/load-record-integrity.mjs',import.meta.url),'utf8').replaceAll('export ',''),ui=readFileSync(new URL('../ui/load-record-integrity.js',import.meta.url),'utf8');
 replace("function employeeCheckLoadWrite(ref,data,mode='set'){",`// LOAD_RECORD_INTEGRITY_V791\n${pure}\n${ui}\nfunction employeeCheckLoadWrite(ref,data,mode='set'){\n const integrityPath=employeePath(ref).split('/');\n if(integrityPath[3]==='sm2_carregamentos')assertLoadRecordWriteV791(employeeLoadRecord(integrityPath[5]),data,mode);`);
 replace('  function statusGrupoV392(itens){',"  function statusGrupoV392(itens){\n    if(itens.length&&itens.every(incompleteLoadRowV791))return {chave:'incompleto',txt:'Registro incompleto'};");
 replace(".filter(Boolean).join(' • ')||r.pecas+' peças';", ".filter(Boolean).join(' • ')||(st.chave==='incompleto'?'Sem dados físicos':r.pecas+' peças');");
 replace('<span class="v408-destino-nome">${esc(destino)}</span>','<span class="v408-destino-nome">${esc(st.chave===\'incompleto\'?\'Registro incompleto\':destino)}</span>');
 replace("      if(estadoCargasV408.gid!==gid)return '';", "      if(estadoCargasV408.gid!==gid)return '';\n      if(itens.every(incompleteLoadRowV791))return incompleteLoadCardV791(gid,itens);");
 return app;
}
