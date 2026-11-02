import {readFileSync} from 'node:fs';
export function applyBillingAccess(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;let end=start+1;
 for(;end<html.length;end++){if(html[end]==='\\'){end++;continue}if(html[end]==='"'){end++;break}}
 let app=JSON.parse(html.slice(start,end)),shell=html.slice(end),prefix=html.slice(0,start);
 const pure=readFileSync(new URL('../public/billing-access.mjs',import.meta.url),'utf8').replaceAll('export ','');
 prefix=prefix.replace(/<script id="billing-access-root">[\s\S]*?<\/script>/,'');
 const rootAnchor=prefix.includes('<script id="employee-access-root">')?'<script id="employee-access-root">':'<script type="module">';
 prefix=prefix.replace(rootAnchor,'<script id="billing-access-root">'+pure+'\n'+readFileSync(new URL('../ui/billing-root.js',import.meta.url),'utf8')+'</script>'+rootAnchor);
 if(!app.includes('// BILLING_ACCESS_FRAME_V1')){
  const replace=(a,b)=>{if(!app.includes(a))throw Error('Billing frame anchor: '+a);app=app.replace(a,b)};
  replace('function setDoc(ref,dados,opcoes){','function setDoc(ref,dados,opcoes){\n exigirEscritaPlano();');
  replace('function deleteDoc(ref){','function deleteDoc(ref){exigirEscritaPlano();');
  replace('function writeBatch(database){','function writeBatch(database){\n exigirEscritaPlano();');
  replace(' commit(){',' commit(){\n exigirEscritaPlano();');
  replace("function enfileirarOffline(nome,id,obj,modo='set'){","function enfileirarOffline(nome,id,obj,modo='set'){\n exigirEscritaPlano();");
  replace('async function sincronizarOfflineOps(){','async function sincronizarOfflineOps(){\n if(!acessoPlanoAtual().write)return;');
  replace('while(conexaoOnline()&&!lotePacotesEmCurso){','while(conexaoOnline()&&!lotePacotesEmCurso&&acessoPlanoAtual().write){');
  replace('async function enviarOperacaoOrcamentoV705(op){','async function enviarOperacaoOrcamentoV705(op){\n exigirEscritaPlano();');
  replace('function abrirObservadoresV428(){','function abrirObservadoresV428(){\n if(!acessoPlanoAtual().read)return;');
  const target='const credentialV456=parent.__v456TakeCredentials();';
  replace(target,'// BILLING_ACCESS_FRAME_V1\n'+readFileSync(new URL('../ui/billing-frame.js',import.meta.url),'utf8')+'\n'+target);
 }
 if(!shell.includes('// BILLING_ACCESS_SHELL_V1')){
  shell='\n// BILLING_ACCESS_SHELL_V1\n'+shell;
  const replace=(a,b)=>{if(!shell.includes(a))throw Error('Billing shell anchor: '+a.slice(0,100));shell=shell.replace(a,b)};
  const query="  await sdk.getDocsFromServer(sdk.query(sdk.collection(db,'empresas',empresaId,'dados','sm2_madeiras','registros'),sdk.limit(1)));";
  replace(query,`  try{const policy=await sdk.getDocFromServer(sdk.doc(db,'empresas',empresaId,'acesso','plano'));window.__smSetAccessPolicy(policy.exists()?policy.data():null);}catch(error){if(!['permission-denied','unavailable','deadline-exceeded'].includes(error?.code))throw error;try{const saved=await sdk.getDocFromCache(sdk.doc(db,'empresas',empresaId,'acesso','plano'));window.__smSetAccessPolicy(saved.exists()?saved.data():null);}catch{window.__smSetAccessPolicy(null);}}
  if(window.__smAccessState().read)${query.trim()}`);
  replace('ativo:true,verificadoEm:Date.now()}','ativo:true,verificadoEm:Date.now(),planoAcesso:window.__smGetAccessPolicy?.()||null}');
  const loaderStart=shell.indexOf('async function lerVinculoOffline('),loaderEnd=shell.indexOf('window.__smValidarVinculoOffline',loaderStart);
  let loader=shell.slice(loaderStart,loaderEnd);
  if(!loader.includes(' return dados;'))throw Error('Offline member loader missing');
  loader=loader.replace(' return dados;',` let cachedPolicy=registro.planoAcesso||null;
 try{const cached=await sdk.getDocFromCache(sdk.doc(db,'empresas',empresaId,'acesso','plano'));if(cached.exists())cachedPolicy=cached.data();}catch{}
 window.__smSetAccessPolicy(cachedPolicy);
 return dados;`);shell=shell.slice(0,loaderStart)+loader+shell.slice(loaderEnd);
  const context='context=Object.freeze({uid,empresaId,offline:sessaoOffline});credentials=null;';
  replace(context,context+`\n  window.__smBeginAccessSession({uid,empresaId,sdk,db});
  if(window.__smAccessState().phase==='settings'){window.__smRenderRestricted();busy=false;return;}`);
  replace('async function close(){','async function close(){\n window.__smStopAccessSession?.();');
  replace(' credentials=null;\n $(\'login\').hidden=true;frame.hidden=false;'," if(window.__smAccessState().phase==='settings'){window.__smRenderRestricted();busy=false;return;}\n credentials=null;\n $('login').hidden=true;frame.hidden=false;");
 }
 return prefix+JSON.stringify(app).replaceAll('</','<\\/')+shell;
}
