import {readFileSync} from 'node:fs';
export function applyInconsistentLoadArchive(html){
 const start=html.indexOf('const TEMPLATE=')+15;let end=start+1;
 for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));if(app.includes('// ARCHIVE_INCONSISTENT_LOAD_V1'))return html;
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Trecho de arquivamento mudou: '+a.slice(0,80));app=app.replace(a,()=>b);};
 const pure=readFileSync(new URL('../public/archive-inconsistent-load.mjs',import.meta.url),'utf8').replaceAll('export ',''),ui=readFileSync(new URL('../ui/archive-inconsistent-load.js',import.meta.url),'utf8');
 replace('window.statusEfetivoCargaV589=function(x){',`// ARCHIVE_INCONSISTENT_LOAD_V1
 ${pure}
 ${ui}
 window.statusEfetivoCargaV589=function(x){
  if(x?.cargaArquivadaInconsistenteEm)return 'arquivado_inconsistente';`);
 replace('  function statusGrupoV392(itens){',"  function statusGrupoV392(itens){\n    if(itens.length&&itens.every(x=>x.cargaArquivadaInconsistenteEm))return {chave:'arquivado',txt:'Arquivado • inconsistência'};");
 const action='<button type="button" class="btn btn-secondary" onclick="alternarPlanilhaCargaV392(\'${pid}\',this)">${aberto?\'Recolher planilha\':\'Abrir planilha\'}</button>';
 replace(action,action+"\n            ${itens.some(i=>!i.cargaArquivadaInconsistenteEm&&['montagem','aguardando_conferencia'].includes(window.statusEfetivoCargaV589(i)))?`<button type=\"button\" class=\"btn btn-secondary\" onclick=\"arquivarCargaInconsistenteV1('${gidjs}')\">Arquivar teste com inconsistência</button>`:''}");
 replace("  if(finalidadeSaida==='Carga'&&carregamentos.some(x=>String(x.id)===String(item.id)&&x.cargaBaixadaEm))return;", "  if(finalidadeSaida==='Carga'&&carregamentos.some(x=>String(x.id)===String(item.id)&&x.cargaArquivadaInconsistenteEm))throw Error('Este carregamento foi arquivado com inconsistência e não pode receber nova baixa.');\n  if(finalidadeSaida==='Carga'&&carregamentos.some(x=>String(x.id)===String(item.id)&&x.cargaBaixadaEm))return;");
 return html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
}
