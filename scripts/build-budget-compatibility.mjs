import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function buildBudgetCompatibility(input=new URL('../public/index.html',import.meta.url)){
 const file=input instanceof URL?input:pathToFileURL(resolve(input));
 let html=readFileSync(file,'utf8');
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));
 if(!app.includes('// BUDGET_COMPATIBILITY_V703')){
  function replace(before,after){if(!app.includes(before)||app.indexOf(before)!==app.lastIndexOf(before))throw Error('Trecho de gravação mudou: '+before.slice(0,70));app=app.replace(before,()=>after);}
  const helper=readFileSync(new URL('../ui/budget-records.js',import.meta.url),'utf8');
  replace('function setDoc(ref,dados,opcoes){',`// BUDGET_COMPATIBILITY_V703\n${helper}\nfunction setDoc(ref,dados,opcoes){\n dados=normalizarRegistroOrcamentoV703(ref,dados,opcoes);`);
  replace(" set(ref,dados,opcoes){registrar(opcoes?.merge?'merge':'set',ref,dados,opcoes);", " set(ref,dados,opcoes){dados=normalizarRegistroOrcamentoV703(ref,dados,opcoes);registrar(opcoes?.merge?'merge':'set',ref,dados,opcoes);");
 }
 writeFileSync(file,html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end));
 console.log('Formato dos itens do orçamento compatibilizado. Consulta completa preservada até validar regras e registros legados.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildBudgetCompatibility(process.argv[2]);
