export function applyOrderDocumentBuildV767(app){
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Trecho de pedidos na carga mudou: '+a.slice(0,90));app=app.replace(a,()=>b);};
 const scoped=(start,end,a,b)=>{const x=app.indexOf(start),y=app.indexOf(end,x+start.length);if(x<0||y<0)throw Error('Função do documento não encontrada.');let part=app.slice(x,y);if(!part.includes(a)||part.indexOf(a)!==part.lastIndexOf(a))throw Error('Trecho do documento mudou.');app=app.slice(0,x)+part.replace(a,()=>b)+app.slice(y);};
 replace('<div class="v392-carga-acoes">','<div class="v392-carga-acoes">${orderDocButtonV767(gid)}');
 replace('${resumoFinanceiroHtmlV403(originalFinanceiro)}','${resumoFinanceiroHtmlV403(originalFinanceiro)}${orderDocHtmlV767(gid,Math.round(originalFinanceiro.total*100))}');
 scoped('  function htmlCopiaComercialV400(', '  function gerarCopiaComercialV400(', '${resumoFinanceiroHtmlV403(financeiro)}','${resumoFinanceiroHtmlV403(financeiro)}${orderDocHtmlV767(gid,Math.round(financeiro.total*100))}');
 scoped('  function documentoCopiaPadronizadaV405(', '  function pdfCopiaComercialV400(', 'tabela+resumoFinanceiroHtmlV403(financeiro);','tabela+resumoFinanceiroHtmlV403(financeiro)+orderDocHtmlV767(gid,Math.round(financeiro.total*100));');
 scoped('  function documentoCargaConferenciaV401(', '  function pdfCargaV392(', 'tabela+resumoFinanceiroHtmlV403(financeiro);','tabela+resumoFinanceiroHtmlV403(financeiro)+orderDocHtmlV767(gid,Math.round(financeiro.total*100));');
 scoped('  function gerarTextoCargaV409(', '  async function copiarTextoCargaV409(', "return texto.join('\\n').replace(/\\n{3,}/g,'\\n\\n').trim();", "return texto.join('\\n').replace(/\\n{3,}/g,'\\n\\n').trim()+orderDocTextV767(gid,Math.round(financeiro.total*100));");
 for(const signature of ['gerarCopiaComercialV400(gid,idx)','pdfCargaV392(id,gid)'])replace('  function '+signature+'{','  async function '+signature+'{\n    if(!await orderDocExportV767(gid))return;');
 for(const name of ['copiarCargaV392','copiarCopiaComercialV400','pdfCopiaComercialV400'])replace('  function '+name+'(id){','  async function '+name+'(id){\n    if(!await orderDocExportElementV767(id))return;');
 replace('  function exportarFiscalV559(botao,tipo){','  async function exportarFiscalV559(botao,tipo){\n    if(!await orderDocExportV767(botao.closest(\'.fiscal-form-v559\')?.dataset.gid))return;');
 return app;
}
