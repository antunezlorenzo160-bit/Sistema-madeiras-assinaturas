import {readFileSync} from 'node:fs';
export function applyOfflineBoot(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker);if(start<0)throw Error('Offline shell missing');
 let prefix=html.slice(0,start),tail=html.slice(start);
 prefix=prefix.replace(/<script id="offline-boot-v5">[\s\S]*?<\/script>/,'');
 const target='<script type="module">';if(!prefix.includes(target))throw Error('Offline module bootstrap missing');
 prefix=prefix.replace(target,'<script id="offline-boot-v5">'+readFileSync(new URL('../ui/offline-auth-network.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../ui/offline-boot.js',import.meta.url),'utf8')+'</script>'+target);
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
 if(!shell.includes('// OFFLINE_AUTH_STARTUP_V6')){
  const oldStartup="await auth.authStateReady();if(auth.currentUser){$('lembrar').checked=true;await abrirSessaoV492();return}";
  if(!shell.includes(oldStartup))throw Error('Saved-session startup anchor missing');
  shell=shell.replace(oldStartup,"/* bounded saved-session restoration */ try{out.textContent='Restaurando sessão salva neste aparelho…';await auth.authStateReady();}finally{window.__smConcluirRestauracaoAuth?.();}if(auth.currentUser){$('lembrar').checked=true;await abrirSessaoV492(true);return}");
  shell=shell.replace('async function abrirSessaoV492(){','// OFFLINE_AUTH_STARTUP_V6\nasync function abrirSessaoV492(restaurando=false){');
  const offlineCheck=" if(!navigator.onLine){\n  await lerVinculoOffline(uid);";
  if(!shell.includes(offlineCheck))throw Error('Saved-account verification anchor missing');
  shell=shell.replace(offlineCheck," if(!navigator.onLine||(restaurando&&window.__smAuthNetworkUnavailable===true)){\n  await lerVinculoOffline(uid);");
 }
 return (html.slice(0,end)+shell).replace(/Acesso offline • revisão [45]/,'Acesso offline • revisão 6');
}
