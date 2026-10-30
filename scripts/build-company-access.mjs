import {applyBillingAccess} from './billing-access-build.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function buildCompanyAccess(input=new URL('../public/index.html',import.meta.url)){
 const file=input instanceof URL?input:pathToFileURL(resolve(input));let html=readFileSync(file,'utf8');
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));
 if(!app.includes('// COMPANY_ACCESS_V707')){
  const target='parent.__v456Ready({empresaId:empresaV456,uid:boundV456.uid,persistente:window.__v456Local.durable});';
  if(!app.includes(target)||app.indexOf(target)!==app.lastIndexOf(target))throw Error('Confirmação de acesso não encontrada.');
  const helper=readFileSync(new URL('../ui/company-access.js',import.meta.url),'utf8');
  app=app.replace(target,()=>`// COMPANY_ACCESS_V707\n${helper}\nacompanharAcessoEmpresaV707();\n${target}`);
 }
 writeFileSync(file,applyBillingAccess(html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end)));
 console.log('Aviso de teste e acompanhamento de suspensão por vínculo ativo preparados.');
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)buildCompanyAccess(process.argv[2]);
