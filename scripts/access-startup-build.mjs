import {readFileSync} from 'node:fs';
export function applyAccessStartupDeadline(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let shell=html.slice(end);
 if(shell.includes('// ACCESS_STARTUP_DEADLINE_V8'))return html;
 const helper=readFileSync(new URL('../public/access-startup-deadline.mjs',import.meta.url),'utf8').replaceAll('export ','');
 const a=shell.indexOf('async function abrirSessaoV492('),b=shell.indexOf('\nfunction falhaEntradaV492',a);
 if(a<0||b<0)throw Error('Validação inicial da empresa não encontrada.');
 let opening=shell.slice(a,b);
 opening=opening.replace(" etapaEntradaOffline='validação da empresa';",` etapaEntradaOffline='validação da empresa';
 out.textContent='Conferindo vínculo da empresa…';
 const lerDocInicialV8=ref=>withAccessDeadline(()=>sdk.getDocFromServer(ref),'validar a empresa');
 const lerDocsInicialV8=ref=>withAccessDeadline(()=>sdk.getDocsFromServer(ref),'consultar os dados da empresa');`);
 // Replace calls in the original body, retaining the wrappers' SDK references.
 const wrappersEnd=opening.indexOf(" const uid=");
 if(wrappersEnd<0)throw Error('Identidade da sessão não encontrada.');
 opening=opening.slice(0,wrappersEnd)+opening.slice(wrappersEnd).replaceAll('sdk.getDocFromServer(', 'lerDocInicialV8(').replaceAll('sdk.getDocsFromServer(', 'lerDocsInicialV8(')
  .replace('await window.__smResolveCompanyMember(m.data(),uid)',"await withAccessDeadline(()=>window.__smResolveCompanyMember(m.data(),uid),'confirmar o perfil de acesso',9000)");
 shell=shell.slice(0,a)+'// ACCESS_STARTUP_DEADLINE_V8\n'+helper+'\n'+opening+shell.slice(b);
 const c=shell.indexOf('async function lerVinculoOffline('),d=shell.indexOf('window.__smValidarVinculoOffline=',c);
 if(c<0||d<0)throw Error('Leitura do vínculo salvo não encontrada.');
 let cached=shell.slice(c,d);
 cached=cached.replace('const membro=await sdk.getDocFromCache(sdk.doc(db,\'membros\',uid));',"const membro=await withAccessDeadline(()=>sdk.getDocFromCache(sdk.doc(db,'membros',uid)),'ler o vínculo salvo');");
 cached=cached.replace("['unavailable','failed-precondition']","['unavailable','failed-precondition','deadline-exceeded']");
 cached=cached.replace("const cached=await sdk.getDocFromCache(sdk.doc(db,'empresas',empresaId,'acesso','plano'));","const cached=await withAccessDeadline(()=>sdk.getDocFromCache(sdk.doc(db,'empresas',empresaId,'acesso','plano')),'ler a regra de acesso salva');");
 shell=shell.slice(0,c)+cached+shell.slice(d);
 return (html.slice(0,end)+shell).replace(/Acesso offline • revisão [4567]/,'Acesso offline • revisão 8');
}
