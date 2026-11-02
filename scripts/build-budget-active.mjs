import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const defaults=JSON.parse(readFileSync(new URL('../config/budget-active.json',import.meta.url),'utf8'));

export function buildBudgetActive(input=new URL('../public/index.html',import.meta.url),configuration=defaults){
  const file=input instanceof URL?input:pathToFileURL(resolve(input));let html=readFileSync(file,'utf8');
  const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
  if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
  let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
  let app=JSON.parse(html.slice(start,end));
  if(!app.includes('// BUDGET_ACTIVE_V704')){
    if(!app.includes('// BUDGET_COMPATIBILITY_V703'))throw Error('Prepare primeiro a compatibilidade de gravação.');
    function replace(before,after){if(!app.includes(before)||app.indexOf(before)!==app.lastIndexOf(before))throw Error('Trecho do orçamento mudou: '+before.slice(0,70));app=app.replace(before,()=>after);}
    const helper=readFileSync(new URL('../ui/budget-active.js',import.meta.url),'utf8');
    replace('function registrarColecaoV701(chave,nome,sessao){',`// BUDGET_ACTIVE_V704\nconst FILTRO_ORCAMENTO_V704=${configuration.enabled===true};\n${helper}\nfunction registrarColecaoV701(chave,nome,sessao){`);
    replace('onSnapshot(collection(db,nome),{includeMetadataChanges:true}', 'onSnapshot(consultaColecaoAtivaV704(nome),{includeMetadataChanges:true}');
    replace('\niniciarSincronismoTempoReal();','\nawait prepararOrcamentoAtivoV704();\niniciarSincronismoTempoReal();');
  }
  app=app.replace(/const FILTRO_ORCAMENTO_V704=(?:true|false);/,'const FILTRO_ORCAMENTO_V704='+(configuration.enabled===true)+';');
  writeFileSync(file,html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end));
  console.log('Filtro do orçamento preparado; ativação: '+(configuration.enabled===true?'habilitada':'aguardando regras publicadas'));
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildBudgetActive(process.argv[2]);
