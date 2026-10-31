import {readFileSync} from 'node:fs';
export function applyEmployeeLoadAccess(app){
 if(app.includes('// EMPLOYEE_LOAD_DRAFTS_V1')){const target='async function apagarCargaAtualV388(){';if(!app.includes(target+'\n    employeeRequireLoadAdmin();'))app=app.replace(target,target+'\n    employeeRequireLoadAdmin();');return app;}
 const replace=(old,next)=>{if(!app.includes(old))throw Error('Load permissions anchor: '+old.slice(0,110));app=app.replace(old,next);};
 replace('function setDoc(ref,dados,opcoes){',"function setDoc(ref,dados,opcoes){\n employeeCheckLoadWrite(ref,dados,opcoes?.merge?'merge':'set');");
 replace('function deleteDoc(ref){',"function deleteDoc(ref){employeeCheckLoadWrite(ref,null,'delete');");
 replace('const registrar=(modo,ref,dados,opcoes)=>{',"const registrar=(modo,ref,dados,opcoes)=>{employeeCheckLoadWrite(ref,dados,modo);");
 replace("function enfileirarOffline(nome,id,obj,modo='set'){", "function enfileirarOffline(nome,id,obj,modo='set'){\n employeeCheckLoadWrite(doc(db,nome,id),obj,modo);");
 replace('function usuarioAtualCargaV388(){',"function usuarioAtualCargaV388(){\n const member=parent.__smEmployeeMember();const actor=employeeLoadActor();return {nome:actor.name,uid:actor.uid,funcao:member?.papel==='admin'?'Administrador':member?.funcao||'Funcionário',status:member?.ativo?'ativo':'bloqueado'};");
 replace("return parent.__smEmployeeCan('stock',true)&&parent.__smEmployeeCan('loads',true);", "return parent.__smEmployeeMember()?.papel==='admin';");
 replace("      cargaFluxoV388:true,\n      cargaStatus:'montagem',", "      cargaFluxoV388:true,\n      cargaCriadaPorUid:employeeLoadActor().uid,\n      cargaCriadaPorNome:employeeLoadActor().name,\n      cargaStatus:'montagem',");
 replace('async function fecharCarregamentoV388(){', 'async function fecharCarregamentoV388(){\n    employeeRequireLoadAdmin();');
 replace('async function apagarCargaAtualV388(){', 'async function apagarCargaAtualV388(){\n    employeeRequireLoadAdmin();');
 replace("cargaStatus:'aguardando_conferencia',cargaFechadaEm:agora,cargaFechadaPor:quem,", "cargaStatus:'aguardando_conferencia',cargaFechadaEm:agora,cargaFechadaPor:quem,cargaFechadaPorUid:employeeLoadActor().uid,");
 replace("const por=String(x.cargaFechadaPor||x.vendedor||'').trim();", "const por=loadContributors(itens);");
 replace('function renderCarregamentosV392(){',"function renderCarregamentosV392(){\n    if(parent.__smEmployeeMember()?.papel!=='admin'){garantirAreaCarregamentosV392();const host=document.getElementById('listaCarregamentosV392');if(host)renderEmployeeLoadDrafts(host);return;}");
 replace("function continuarCarregamentoV397(gid){", "function continuarCarregamentoV397(gid){\n    employeeRequireLoadDraftWrite();");
 // Protect original documents even if their exported handlers are invoked directly.
 for(const signature of ['async function excluirCarregamentoMontagemV397(gid){','async function salvarClienteV407(gid,idx){','async function salvarTransporteV414(gid,idx){','async function salvarAjustesFinanceirosV403(gid,idx,tipo){','async function salvarPercentuaisCopiaV400(gid,idx){','async function salvarFiscalV559(botao){','function abrirRomaneioV418(gid){','function copiarCargaV392(id){','function pdfCargaV392(id,gid){','function abrirCarregamentoV408(gid){','function mostrarCopiaV408(){','function gerarCopiaComercialV400(gid,idx){','function exportarFiscalV559(botao,tipo){'])replace(signature,signature+'\n    employeeRequireLoadAdmin();');
 replace("cargaBaixadaEm:agora,cargaConferidaPor:quem,","cargaBaixadaEm:agora,cargaConferidaPor:quem,cargaConferidaPorUid:employeeLoadActor().uid,");
 replace('function atualizarFluxoCargaV388(){', 'function atualizarFluxoCargaV388(){\n    employeeLoadControls();');
 return app.replace('<head>','<head>\n<!-- // EMPLOYEE_LOAD_DRAFTS_V1 -->');
}
