import {applySplitEmployeePermissions} from './split-employee-permissions.mjs';
import {readFileSync} from 'node:fs';
export function applyEmployeeAccess(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;let end=start+1;
 for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let prefix=html.slice(0,start),app=JSON.parse(html.slice(start,end)),shell=html.slice(end);
 const pure=readFileSync(new URL('../public/employee-permissions.mjs',import.meta.url),'utf8').replaceAll('export ','');
 const root='<script id="employee-access-root">'+pure+'\n'+readFileSync(new URL('../ui/employee-root.js',import.meta.url),'utf8')+'</script>';
 prefix=prefix.replace(/<script id="employee-access-root">[\s\S]*?<\/script>/,'').replace('<script type="module">',root+'<script type="module">');
 if(!shell.includes('// EMPLOYEE_ACCESS_SHELL_V1')){
  const replace=(a,b)=>{if(!shell.includes(a))throw Error('Employee shell anchor: '+a.slice(0,90));shell=shell.replace(a,b);};
  replace('const empresaId=m.data().empresaId;expected[uid]=empresaId;','const empresaId=m.data().empresaId;expected[uid]=empresaId;window.__smSetEmployeeMember(m.data(),uid);');
  replace('if(window.__smAccessState().read)await sdk.getDocsFromServer',"if(window.__smAccessState().read&&window.__smEmployeeCollectionCan('sm2_madeiras'))await sdk.getDocsFromServer");
  replace('planoAcesso:window.__smGetAccessPolicy?.()||null}', 'planoAcesso:window.__smGetAccessPolicy?.()||null,employeeMember:window.__smEmployeeMember?.()||null}');
  replace('dados=salvo;', 'dados=salvo.employeeMember||salvo;');
  replace('window.__smSetAccessPolicy(cachedPolicy);\n return dados;',"window.__smSetAccessPolicy(cachedPolicy);\n window.__smSetEmployeeMember(dados,uid);\n return dados;");
  shell='\n// EMPLOYEE_ACCESS_SHELL_V1\n'+shell;
 }
 if(!app.includes('// EMPLOYEE_ACCESS_FRAME_V1')){
  const replace=(a,b)=>{if(!app.includes(a))throw Error('Employee frame anchor: '+a.slice(0,100));app=app.replace(a,b);};
  replace("const prefix='sm_v462_principal:'+ctx.empresaId+':';", "const prefix='sm_v462_principal:'+ctx.empresaId+':'+(parent.__smEmployeeMember()?.papel==='admin'?'':'employee:'+ctx.uid+':');");
  replace('getItem:k=>durable?storage.getItem(prefix+String(k)):(fallback.get(String(k))??null),','getItem:k=>parent.__smEmployeeStorageValue(String(k),durable?storage.getItem(prefix+String(k)):(fallback.get(String(k))??null)),');
  replace('window.__v456Local=scoped(l);window.__v456Session=scoped(s);','window.__v456Local=scoped(l);window.__v456Session=scoped(s);window.__v456Local.removeItem(\'sm_dev_usuario_atual_teste_v1\');');
  replace('getDocFromCache, writeBatch:', 'getDocFromCache: rawEmployeeGetDocFromCache, writeBatch:');
  for(const [name,raw,kind] of [['getDocs','rawGetDocsV700','consultaComCache'],['getDocsFromServer','rawGetDocsServerV700','consultaServidor'],['getDocFromServer','rawGetDocServerV700','documentoServidor'],['getCountFromServer','rawGetCountServerV700','contagemServidor']])replace(`const ${name}=diagnosticoLeiturasV700.wrapRead('${kind}',${raw});`,`const ${name}=employeeRead(diagnosticoLeiturasV700.wrapRead('${kind}',${raw}));`);
  replace('const onSnapshot=diagnosticoLeiturasV700.wrapSnapshot(rawOnSnapshotV700);','const onSnapshot=employeeSnapshot(diagnosticoLeiturasV700.wrapSnapshot(rawOnSnapshotV700));\nconst getDocFromCache=employeeRead(rawEmployeeGetDocFromCache);');
  replace('function setDoc(ref,dados,opcoes){','function setDoc(ref,dados,opcoes){\n employeeAssertWrite(ref);');
  replace('function deleteDoc(ref){','function deleteDoc(ref){employeeAssertWrite(ref);');
  replace('const registrar=(modo,ref,dados,opcoes)=>{operacoes.push', 'const registrar=(modo,ref,dados,opcoes)=>{employeeAssertWrite(ref);operacoes.push');
  replace("function enfileirarOffline(nome,id,obj,modo='set'){", "function enfileirarOffline(nome,id,obj,modo='set'){\n employeeAssertWrite(doc(db,nome,id));");
  replace('async function enviarOperacaoOrcamentoV705(op){','async function enviarOperacaoOrcamentoV705(op){\n employeeAssertWrite(doc(db,op.nome,op.id));');
  replace('for(const op of lote){\n        if(lotePacotesEmCurso)break;', 'for(const op of lote){\n        if(lotePacotesEmCurso)break;\n        if(!parent.__smEmployeeCollectionCan(op.nome,true))continue;');
  replace('async function prepararOrcamentoAtivoV704(){','async function prepararOrcamentoAtivoV704(){\n if(!parent.__smEmployeeCan(\'budgets\'))return false;');
  replace("const canalResumoAbasV606=typeof BroadcastChannel==='function'?new BroadcastChannel(`sm2_resumo_abas:${empresaV456}`):null;", "const canalResumoAbasV606=typeof BroadcastChannel==='function'?new BroadcastChannel(`sm2_resumo_abas:${empresaV456}:${parent.__smEmployeeMember()?.papel==='admin'?'admin':boundV456.uid}`):null;");
  replace('function pcAtivarAba(nome){','function pcAtivarAba(nome){\n if(!employeeTabAllowed(nome))return;');
  replace('function pcAbrirDestinoTelaCompleta(nome){','function pcAbrirDestinoTelaCompleta(nome){\n if(!employeeTabAllowed(nome))return;');
  replace('function idFuncionarioAtualProducao(){',"function idFuncionarioAtualProducao(){\n const member=parent.__smEmployeeMember();return member?.nome||member?.email||boundV456.uid;");
  replace('function abrirTelaProducao(){','function abrirTelaProducao(){\n if(!parent.__smEmployeeCan(\'budgets\'))return;');
  replace("return !u || (u.status==='ativo' && u.funcao==='Administrador');", "return parent.__smEmployeeCan('stock',true)&&parent.__smEmployeeCan('loads',true);");
  replace('function podeEditarObservacaoProducao(){','function podeEditarObservacaoProducao(){\n return parent.__smEmployeeCan(\'budgets\',true);\n /* Legacy preview role no longer determines authenticated access. */');
  const target='const credentialV456=parent.__v456TakeCredentials();';
  replace(target,'// EMPLOYEE_ACCESS_FRAME_V1\n'+readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8')+'\n'+target);
  const listener="    const notice=snapshot.data().avisoPlataforma;";
  replace(listener,"    parent.__smSetEmployeeMember(snapshot.data(),boundV456.uid);\n"+listener);
 }
 const helperStart=app.indexOf('// EMPLOYEE_ACCESS_FRAME_V1\n'),helperEnd=app.indexOf('const credentialV456=parent.__v456TakeCredentials();',helperStart);
 if(helperStart<0||helperEnd<0)throw Error('Employee helper not found.');
 app=app.slice(0,helperStart)+'// EMPLOYEE_ACCESS_FRAME_V1\n'+readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8')+'\n'+app.slice(helperEnd);
 app=app.replace('getItem:k=>parent.__smEmployeeStorageAllowed(String(k))?(durable?storage.getItem(prefix+String(k)):(fallback.get(String(k))??null)):null,','getItem:k=>parent.__smEmployeeStorageValue(String(k),durable?storage.getItem(prefix+String(k)):(fallback.get(String(k))??null)),');
 app=applySplitEmployeePermissions(app);
 return prefix+JSON.stringify(app).replaceAll('</','<\\/')+shell;
}
