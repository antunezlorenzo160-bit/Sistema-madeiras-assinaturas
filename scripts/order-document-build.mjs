export function applyOrderDocumentBuildV767(app){
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Trecho de pedidos na carga mudou: '+a.slice(0,90));app=app.replace(a,()=>b);};
 const scoped=(start,end,a,b)=>{const x=app.indexOf(start),y=app.indexOf(end,x+start.length);if(x<0||y<0)throw Error('Função do documento não encontrada.');let part=app.slice(x,y);if(!part.includes(a)||part.indexOf(a)!==part.lastIndexOf(a))throw Error('Trecho do documento mudou.');app=app.slice(0,x)+part.replace(a,()=>b)+app.slice(y);};
 replace('  function mostrarCopiaV408(){', '  async function mostrarCopiaV408(){\n    if(!estadoCargasV408.copia){if(!await orderDocExportV767(estadoCargasV408.gid))return;orderDocResetCopyV771(estadoCargasV408.gid);renderCarregamentosV392();}');
 scoped('  function gruposProdutosCopiaV400(', '  function statusCopiaV400(', "    return [...mapa.values()]", "    orderDocAppendCopyGroupsV771(itens,mapa);\n    return [...mapa.values()]");
 scoped('  async function salvarPercentuaisCopiaV400(', '  function valorOriginalLinhaV399(', "    iniciarMutacaoCargaV396();", "    if(await orderDocSaveCopyV771(gid,idx,valores))return;\n    iniciarMutacaoCargaV396();");
 replace('<div id="copiaFormV400_${idx}" class="v400-copia-box no-print" data-pendente="0">','<div id="copiaFormV400_${idx}" class="v400-copia-box no-print" data-pendente="0" ${orderDocCopyFormAttrsV771(gid)}>');
 scoped('  function mudarEstadoCopiaV400(', '  function preencherTodosCopiaV400(', "    if(card){card.dataset.pendente='1';", "    if(card){orderDocPinCopyV771(card);card.dataset.pendente='1';");
 replace('<div class="v392-carga-acoes">','<div class="v392-carga-acoes">${orderDocButtonV767(gid)}');
 replace('${resumoFinanceiroHtmlV403(originalFinanceiro)}','${resumoFinanceiroHtmlV403(originalFinanceiro)}${orderDocHtmlV767(gid,Math.round(originalFinanceiro.total*100))}');
 scoped('  function htmlCopiaComercialV400(', '  function gerarCopiaComercialV400(', '${resumoFinanceiroHtmlV403(financeiro)}','${resumoFinanceiroHtmlV403(financeiro)}${orderDocHtmlV767(gid,Math.round(financeiro.total*100),true)}');
 scoped('  function documentoCopiaPadronizadaV405(', '  function pdfCopiaComercialV400(', 'tabela+resumoFinanceiroHtmlV403(financeiro);','tabela+resumoFinanceiroHtmlV403(financeiro)+orderDocHtmlV767(gid,Math.round(financeiro.total*100),true);');
 scoped('  function documentoCargaConferenciaV401(', '  function pdfCargaV392(', 'tabela+resumoFinanceiroHtmlV403(financeiro);','tabela+resumoFinanceiroHtmlV403(financeiro)+orderDocHtmlV767(gid,Math.round(financeiro.total*100));');
 scoped('  function gerarTextoCargaV409(', '  async function copiarTextoCargaV409(', "return texto.join('\\n').replace(/\\n{3,}/g,'\\n\\n').trim();", "return texto.join('\\n').replace(/\\n{3,}/g,'\\n\\n').trim()+orderDocTextV767(gid,Math.round(financeiro.total*100),comercial);");
 for(const signature of ['gerarCopiaComercialV400(gid,idx)','pdfCargaV392(id,gid)'])replace('  function '+signature+'{','  async function '+signature+'{\n    if(!await orderDocExportV767(gid))return;');
 for(const name of ['copiarCargaV392','copiarCopiaComercialV400','pdfCopiaComercialV400'])replace('  function '+name+'(id){','  async function '+name+'(id){\n    if(!await orderDocExportElementV767(id))return;');
 replace('  function exportarFiscalV559(botao,tipo){','  async function exportarFiscalV559(botao,tipo){\n    if(!await orderDocExportV767(botao.closest(\'.fiscal-form-v559\')?.dataset.gid))return;');
 return app;
}
