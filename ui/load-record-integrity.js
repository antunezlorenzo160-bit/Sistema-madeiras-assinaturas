async function copiarDiagnosticoCargaV791(gid){
 employeeRequireLoadAdmin();
 const rows=loadRowsForGroupV793(typeof carregamentos==='undefined'?[]:carregamentos,gid);
 if(!rows.length){alert('Não encontrei os itens desta carga no aparelho. Volte à lista e abra o carregamento novamente.');return;}
 const report=loadRecordDiagnosticV791(rows);
 const text=JSON.stringify(report,null,2);
 try{await navigator.clipboard.writeText(text);alert('Diagnóstico copiado. Ele contém os campos técnicos e as medidas deste registro, sem senhas ou tokens.');}
 catch{const area=document.createElement('textarea');area.readOnly=true;area.value=text;area.style.cssText='width:100%;min-height:240px';const host=document.querySelector('#v408-detalhe');host?.querySelector('[data-load-diagnostic-v791]')?.remove();area.dataset.loadDiagnosticV791='1';host?.appendChild(area);area.focus();area.select();alert('Selecione e copie o diagnóstico exibido abaixo.');}
}
window.copiarDiagnosticoCargaV791=copiarDiagnosticoCargaV791;
function incompleteLoadCardV791(gid,items){
 return `<div class="v392-carga-card"><h2>Registro incompleto</h2><p>Este registro não tem quantidade, volume ou medidas. Não é possível confirmar uma baixa por estes dados.</p><p>Registros: ${items.length}. Os dados foram preservados para conferência.</p><button type="button" class="btn btn-secondary" data-diagnostico-carga-v791="${esc(gid)}" onclick="copiarDiagnosticoCargaV791(this.dataset.diagnosticoCargaV791)">Copiar diagnóstico</button></div>`;
}
