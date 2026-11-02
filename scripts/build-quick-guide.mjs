import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function buildQuickGuide(input=new URL('../public/index.html',import.meta.url)){
 const file=input instanceof URL?input:pathToFileURL(resolve(input));let html=readFileSync(file,'utf8');
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));
 app=app.replace(/<!-- MANUAL_RAPIDO_V706_START -->[\s\S]*?<!-- MANUAL_RAPIDO_V706_END -->\s*/,'');
 const target='<div class="card" id="configInterface">';
 if(!app.includes(target)||app.indexOf(target)!==app.lastIndexOf(target))throw Error('Painel de configurações não encontrado.');
 const guide=readFileSync(new URL('../ui/manual-rapido.html',import.meta.url),'utf8');
 app=app.replace(target,()=>guide+'\n'+target);
 writeFileSync(file,html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end));
 console.log('Manual rápido incluído em Configurações para todas as empresas.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildQuickGuide(process.argv[2]);
