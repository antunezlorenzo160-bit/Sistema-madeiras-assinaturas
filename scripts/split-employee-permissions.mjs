export function applySplitEmployeePermissions(app){
 if(app.includes('// EMPLOYEE_PERMISSIONS_SPLIT_V2'))return app;
 const replace=(old,next)=>{if(!app.includes(old))throw Error('Permission split anchor: '+old.slice(0,100));app=app.replace(old,next);};
 replace("function abrirInicioDestinoV492(destino){", "function abrirInicioDestinoV492(destino){\n if(!employeeNavigationAllowed({dataset:{inicioDestino:destino}}))return;\n if(destino==='producao'){employeeOpenProduction();return;}");
 replace(" tab?.click();\n pcAbrirDestinoTelaCompleta(alvo);", " if(parent.__smEmployeeMember()?.papel==='admin')tab?.click();\n pcAbrirDestinoTelaCompleta(alvo);");
 replace("function abrirSubabaOrcamento(nome='atual'){", "function abrirSubabaOrcamento(nome='atual'){\n if(!parent.__smEmployeeCan(({atual:'budgets',guardados:'orders',entregas:'orders'})[nome]||'budgets'))return;");
 replace("    if(nome==='carregamentos'){", "    if(nome==='carregamentos'){\n      if(!parent.__smEmployeeCan('loads'))return;");
 replace("function abrirTelaProducao(){\n if(!parent.__smEmployeeCan('budgets'))return;", "function abrirTelaProducao(){\n if(!parent.__smEmployeeCan('production'))return;\n if(parent.__smEmployeeMember()?.papel!=='admin'){employeeOpenProduction();return;}");
 replace("function podeEditarObservacaoProducao(){\n return parent.__smEmployeeCan('budgets',true);", "function podeEditarObservacaoProducao(){\n return parent.__smEmployeeCan('production',true);");
 replace('async function guardarOrcamentoAtual(){',"async function guardarOrcamentoAtual(){\n if(!parent.__smEmployeeCan('orders',true))return alert('Para guardar o orçamento em Pedidos, o administrador precisa liberar Pedidos → Alterar. O orçamento atual foi preservado.');");
 replace("function abrirOrcamentoGuardado(id){", "function abrirOrcamentoGuardado(id){\n if(!parent.__smEmployeeCan('budgets',true))return alert('Editar os itens do pedido exige Orçamentos → Alterar.');");
 for(const signature of ['async function iniciarProducaoPedido(id){','async function finalizarProducaoPedido(id){','async function acaoIniciarPausarRetomar(id){','async function salvarObservacaoProducao(el){','async function salvarMaterialUsadoProducao(el){'])replace(signature,signature+"\n if(parent.__smEmployeeMember()?.papel!=='admin'){employeeOpenProduction();return;}");
 return app.replace('<head>','<head>\n<!-- // EMPLOYEE_PERMISSIONS_SPLIT_V2 -->');
}
