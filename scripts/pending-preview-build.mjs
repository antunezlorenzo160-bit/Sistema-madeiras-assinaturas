import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export function financePreviewContext(context){return context!=='production';}
export function applyPendingPreview(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;let end=start+1;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));if(app.includes('// PENDING_PREVIEW_V710'))return html;
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Trecho da prévia mudou: '+a.slice(0,80));app=app.replace(a,()=>b);};
 const pure=['public/document-pricing.mjs','public/compact-load-tables.mjs','public/compact-documents.mjs','public/sheet-item-totals.mjs','public/stock-charts.mjs','public/company-finance.mjs','public/load-transport.mjs','public/load-sales.mjs','public/minimum-profit.mjs','public/stock-purchase.mjs','public/opening-stock-cost.mjs'].map(p=>read(p).replace(/^import .*;\n/gm,'').replaceAll('export ','')).join('\n');
 const helpers=read('ui/preview-pricing.js')+'\n'+read('ui/compact-print-settings.js')+'\n'+read('ui/sheet-totals.js')+'\n'+read('ui/stock-charts.js')+'\n'+read('ui/company-finance.js')+'\n'+read('ui/reports.js')+'\n'+read('ui/load-transport.js')+'\n'+read('ui/stock-purchase.js');
 replace('function calcPreview(){','// PENDING_PREVIEW_V710\n'+pure+'\n'+helpers+'\nfunction calcPreview(){');
 app=app.replace('function calcPreview(){', 'function calcPreview(){calcPreviewBaseV710();stockPurchaseVisibilityV728();document.getElementById("pricePreviewV710")?.remove();previewDocumentValueV710();}\nfunction calcPreviewBaseV710(){');
 replace('orcamento.push(oi);','orcamento.push(attachPriceV710(oi,orcamento));\n      repriceBudgetV710();\n      Object.assign(oi,orcamento.find(i=>i.id===oi.id)||oi);');
 replace('function renderOrcamento(){\n  if(lotePacotesEmCurso)return;','function renderOrcamento(){\n  if(lotePacotesEmCurso)return;\n  repriceBudgetV710();\n  priceDocumentNoticeV710(orcamento,document.getElementById("orcamento"));');
 replace('function renderLancamentos(){\n  if(lotePacotesEmCurso)return;','function renderLancamentos(){\n  if(lotePacotesEmCurso)return;\n  repriceLoadsV710();\n  priceDocumentNoticeV710(typeof carregamentos!=="undefined"?carregamentos.filter(i=>i.grupoCargaId===sessaoCargaAtual&&i.cargaStatus==="montagem"):[],document.getElementById("resumoCalculadoraExport"));');
 replace('    carregamentos.push({...salvo});\n    lancamentos.push({...salvo});','    const priced=attachPriceV710(salvo,carregamentos.filter(i=>i.grupoCargaId===salvo.grupoCargaId));\n    Object.assign(salvo,priceLoadServices(priced));\n    carregamentos.push({...salvo});\n    lancamentos.push({...salvo});\n    repriceLoadsV710();\n    Object.assign(salvo,carregamentos.find(i=>i.id===salvo.id)||salvo);');
 // Mobile keeps the native keyboard focused while launch completes, and honors explicit hiding.
 replace('async function lancar(){', 'async function lancar(){\n  window.__smCalcKeyboardV733?.beginLaunch();');
 replace("      largura.value='';\n      largura.focus({preventScroll:true});\n      largura.select();", "      if(largura.value!==''||window.__smCalcKeyboardV733?.canRestoreFocus(largura)===false)return;\n      if(document.activeElement!==largura)largura.focus({preventScroll:true});\n      largura.select();");
 app=app.replaceAll("setTimeout(()=>{ $('comprimento').focus(); $('comprimento').select(); },0);", "setTimeout(()=>{const field=$('comprimento');if(window.__smCalcKeyboardV733?.canRestoreFocus(field)===false)return;if(document.activeElement!==field)field.focus();field.select();},0);");
 for(const id of ['volumeGranelV384','volumeFechadoV387']){
  app=app.replaceAll("setTimeout(()=>{try{$('"+id+"').focus();$('"+id+"').select()}catch(e){}},0)","setTimeout(()=>{try{const field=$('"+id+"');if(window.__smCalcKeyboardV733?.canRestoreFocus(field)===false)return;if(document.activeElement!==field)field.focus();field.select();}catch(e){}},0)");
  app=app.replaceAll("setTimeout(()=>{try{$('"+id+"')?.focus();$('"+id+"')?.select()}catch(e){}},0)","setTimeout(()=>{try{const field=$('"+id+"');if(window.__smCalcKeyboardV733?.canRestoreFocus(field)===false)return;if(document.activeElement!==field)field?.focus();field?.select();}catch(e){}},0)");
 }
 app=app.replaceAll("if(!ativo||ativo.tagName!=='INPUT')$('largura').focus({preventScroll:true});", "if((!ativo||ativo.tagName!=='INPUT')&&window.__smCalcKeyboardV733?.canRestoreFocus($('largura'))!==false)$('largura').focus({preventScroll:true});");
 replace("if(modoMedida==='granel')$('volumeGranelV384')?.focus();else if(modoMedida==='m3fechado')$('volumeFechadoV387')?.focus();else $('largura').focus()", "const nextField=modoMedida==='granel'?$('volumeGranelV384'):modoMedida==='m3fechado'?$('volumeFechadoV387'):$('largura');if(window.__smCalcKeyboardV733?.canRestoreFocus(nextField)!==false&&document.activeElement!==nextField)nextField?.focus({preventScroll:true})");
 app=app.replace('</body>','<script id="mobile-calculator-keyboard-v733">'+read('ui/mobile-calculator-keyboard.js')+'</script></body>');
 app=app.replace('</head>','<style id="mobile-calculator-keyboard-v733-style">'+read('ui/mobile-calculator-keyboard.css')+'</style></head>');
 // New stock exits keep an immutable instant for cost chronology, including offline recovery.
 replace("    const mov={\n      id:crypto.randomUUID(),\n      ...(ehCarga?", "    const mov={\n      costRecordedAtV728:Date.now(),\n      id:crypto.randomUUID(),\n      ...(ehCarga?");
 replace("const mov={id:crypto.randomUUID(),data:nowBR(),madeira:item.madeira,madeiraId:item.madeiraId,tipo:'entrada',origem:nome,", "const mov={id:crypto.randomUUID(),costRecordedAtV728:Date.now(),data:nowBR(),madeira:item.madeira,madeiraId:item.madeiraId,tipo:'entrada',origem:nome,");
 // Opt-in purchase capture happens before the legacy stock arrays or offline queue are touched.
 replace("      const eh2=destino==='estoque2',col=eh2?COL.estoque2:COL.estoque1,nome=eh2?'Estoque 2':'Estoque 1';", "      if(stockPurchaseCaptureV728(item,destino))return;\n      const eh2=destino==='estoque2',col=eh2?COL.estoque2:COL.estoque1,nome=eh2?'Estoque 2':'Estoque 1';");
 replace('<div id="cargaEstoqueEscolha"',read('ui/stock-purchase.html')+'<div id="cargaEstoqueEscolha"');
 // Reopening a saved quote is not consent to reprice its historical lines.
 replace('orcamento=itens.map(x=>aplicarCobrancaOrcamento(x));','orcamento=itens.map(x=>aplicarCobrancaOrcamento(x.autoPriceV1?{...x,autoPriceV1:{...x.autoPriceV1,locked:true}}:x));');
 // Reports are separate from stock. Navigation permissions remain in the existing guard.
 const reports=read('ui/reports.html').replace('__REPORT_STOCK_CHARTS__',read('ui/stock-charts.html')).replace('__REPORT_FINANCE__',read('ui/company-finance.html'));
 replace('<section id="estoque" class="tab">',reports+'<section id="estoque" class="tab">');
 const loadMenu='<button type="button" class="inicio-atalho-v464" data-inicio-destino="carregamentos">';
 replace(loadMenu,'<button type="button" class="inicio-atalho-v464" data-inicio-destino="relatorios"><strong>Gráficos e relatórios</strong><span>Indicadores e acompanhamento</span></button>'+loadMenu);
 // Menu action icons are cloned into the sidebar along with their existing controls.
 const menuIconsV731={'Sair da conta':['🚪','Sair da conta'],'⚙ Configurações':['⚙','Configurações'],'Clientes':['👥','Clientes'],'Empresa':['🏢','Empresa'],'Madeiras':['🌳','Madeiras'],'Calculadora':['🧮','Calculadora'],'Orçamentos':['📝','Orçamentos'],'Pedidos':['📋','Pedidos'],'Estoque':['📦','Estoque'],'Movimentações':['🔄','Movimentações'],'Gráficos e relatórios':['📊','Gráficos e relatórios'],'Carregamentos':['🚚','Carregamentos']};
 const menuIconV731=icon=>'<i class="menu-acao-v731" aria-hidden="true">'+icon+'</i> ';
 app=app.replace(/(<button\b[^>]*class="[^"]*\binicio-atalho-v464\b[^"]*"[^>]*>\s*<strong>)([^<]+)(<\/strong>)/g,(original,start,title,end)=>{const entry=menuIconsV731[title.trim()];return entry?start+menuIconV731(entry[0])+entry[1]+end:original;});
 replace("irInicioV525.innerHTML='<strong>Início</strong>","irInicioV525.innerHTML='<strong>"+menuIconV731('🏠')+"Início</strong>");
 app=app.replace('</head>','<style>#employee-production-home::before,#employee-production-menu::before{content:"🏭";display:inline-block;width:1.3em;margin-inline-end:.2em;text-align:center}.inicio-atalho-v464 .menu-acao-v731{display:inline-block;width:1.3em;margin-inline-end:.2em;font-style:normal;line-height:1;text-align:center;vertical-align:-.05em}</style></head>');
 replace('function renderEstoque(){\n  if(lotePacotesEmCurso)return;','function renderEstoque(){\n  if(lotePacotesEmCurso)return;\n  queueStockChartsV720();');
 replace('function renderPlanilhasM3Especies(){\n  if(lotePacotesEmCurso)return;','function renderPlanilhasM3Especies(){\n  if(lotePacotesEmCurso)return;\n  queueStockChartsV720();');
 replace('function avisoHistoricoV701(texto){','function avisoHistoricoV701(texto){\n queueStockChartsV720(texto);');
 // Plate input uses an inline handler; expose its real helper from the load module.
 replace('  window.atualizarTransportePendenteV414=atualizarTransportePendenteV414;','  window.atualizarTransportePendenteV414=atualizarTransportePendenteV414;\n  window.preencherTaraPorPlacaV587=preencherTaraPorPlacaV587;');
 // Freight billed to the customer and real transport costs are distinct.
 replace("${podeCopia?formularioFinanceiroHtmlV403(gid,idx,'original',itens):''}","${podeCopia?formularioFinanceiroHtmlV403(gid,idx,'original',itens):''}${podeCopia?loadTransportFormV723(gid,idx,originalFinanceiro.frete):''}");
 app=app.replace('<label>Frete (R$)<input data-fin-campo="frete"','<label>Frete cobrado do cliente (R$)<input data-fin-campo="frete"');
 app=app.replace('<label>Outras despesas (R$)<input data-fin-campo="outras"','<label>Outros valores cobrados do cliente (R$)<input data-fin-campo="outras"');
 replace(' document.body.appendChild(area);',' compactPrintClone(c,{detailed:window.__v456Local.getItem("compact_pdf_details_v712")==="true"});\n document.body.appendChild(area);');
 app=app.replace(/<body([^>]*)>/, '<body$1><aside class="no-print" style="padding:10px;background:#fff0ca;color:#493b19;font:14px system-ui">Prévia para testes. Use documentos de teste e preserve os registros da empresa.</aside>');
 replace("return `<section class=\"v585-subtotais-especies\"><h3>Totais físicos e subtotal por espécie</h3><div class=\"v585-subtotais-grade\">${cards}</div></section>`;","return `<details class=\"v585-subtotais-especies v714-subtotais-recolher\"><summary>Totais físicos e subtotal por espécie</summary><div class=\"v585-subtotais-grade\">${cards}</div></details>`;");
 app=app.replace('</head>','<style id="preview-layout-v710">'+read('ui/preview-layout.css')+'\n'+read('ui/stock-charts.css')+'\n'+read('ui/reports.css')+'\n'+read('ui/load-transport.css')+'\n'+read('ui/stock-purchase.css')+'</style></head>');
 return html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const path=process.argv[2]||new URL('../public/index.html',import.meta.url);writeFileSync(path,applyPendingPreview(readFileSync(path,'utf8')));writeFileSync(new URL('../Netlify/Funtions/lib/finance-context.mjs',import.meta.url),'// Generated by the build. Preview and production records are isolated.\nexport const FINANCE_PREVIEW='+financePreviewContext(process.env.CONTEXT)+';\n');console.log('Prévia: precificação, planilhas e impressão compacta preparadas; movimentação original preservada.');}
