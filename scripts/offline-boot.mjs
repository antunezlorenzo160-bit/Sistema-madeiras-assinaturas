import {readFileSync} from 'node:fs';
export function applyOfflineBoot(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker);if(start<0)throw Error('Offline shell missing');
 let prefix=html.slice(0,start),tail=html.slice(start);
 prefix=prefix.replace(/<script id="offline-boot-v5">[\s\S]*?<\/script>/,'');
 const target='<script type="module">';if(!prefix.includes(target))throw Error('Offline module bootstrap missing');
 prefix=prefix.replace(target,'<script id="offline-boot-v5">'+readFileSync(new URL('../ui/offline-boot.js',import.meta.url),'utf8')+'</script>'+target);
 html=prefix+tail;
 // Change only the outer login module, never the iframe's JSON string.
 const valueStart=html.indexOf(marker)+marker.length;
 let end=valueStart+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue}if(html[end]==='"'){end++;break}}
 let shell=html.slice(end);
 shell=shell.replaceAll('/sw.js?revisao=4','/sw.js?revisao=5');
 const old="   let registration=await window.__smOfflineRegistration;";
 if(!shell.includes('await window.__smPrepararArquivosOffline(tentarNovamente);')){
  if(!shell.includes(old))throw Error('Offline preparation anchor missing');
  shell=shell.replace(old,"   await window.__smPrepararArquivosOffline(tentarNovamente);\n"+old);
 }
 return (html.slice(0,end)+shell).replace('Acesso offline • revisão 4','Acesso offline • revisão 5');
}
