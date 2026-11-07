import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export function applyPendingPreview(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;let end=start+1;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada.');
 for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));if(app.includes('// PENDING_PREVIEW_V710'))return html;
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const replace=(a,b)=>{if(!app.includes(a)||app.indexOf(a)!==app.lastIndexOf(a))throw Error('Trecho da prévia mudou: '+a.slice(0,80));app=app.replace(a,()=>b);};
 const pure=['public/document-pricing.mjs','public/movement-days.mjs','public/compact-load-tables.mjs','public/compact-documents.mjs'].map(p=>read(p).replace(/^import .*;\n/gm,'').replaceAll('export ','')).join('\n');
 const helpers=read('ui/preview-pricing.js')+'\n'+read('ui/preview-movements.js')+'\n'+read('ui/compact-print-settings.js');
 replace('function calcPreview(){','// PENDING_PREVIEW_V710\n'+pure+'\n'+helpers+'\nfunction calcPreview(){');
 app=app.replace('function calcPreview(){', 'function calcPreview(){calcPreviewBaseV710();document.getElementById("pricePreviewV710")?.remove();previewDocumentValueV710();}\nfunction calcPreviewBaseV710(){');
 replace('orcamento.push(oi);','orcamento.push(attachPriceV710(oi,orcamento));\n      repriceBudgetV710();\n      Object.assign(oi,orcamento.find(i=>i.id===oi.id)||oi);');
 replace('function renderOrcamento(){\n  if(lotePacotesEmCurso)return;','function renderOrcamento(){\n  if(lotePacotesEmCurso)return;\n  repriceBudgetV710();\n  priceDocumentNoticeV710(orcamento,document.getElementById("orcamento"));');
 replace('function renderLancamentos(){\n  if(lotePacotesEmCurso)return;','function renderLancamentos(){\n  if(lotePacotesEmCurso)return;\n  repriceLoadsV710();\n  priceDocumentNoticeV710(typeof carregamentos!=="undefined"?carregamentos.filter(i=>i.grupoCargaId===sessaoCargaAtual&&i.cargaStatus==="montagem"):[],document.getElementById("resumoCalculadoraExport"));');
 replace('    carregamentos.push({...salvo});\n    lancamentos.push({...salvo});','    const priced=attachPriceV710(salvo,carregamentos.filter(i=>i.grupoCargaId===salvo.grupoCargaId));\n    Object.assign(salvo,priced);\n    carregamentos.push({...salvo});\n    lancamentos.push({...salvo});\n    repriceLoadsV710();\n    Object.assign(salvo,carregamentos.find(i=>i.id===salvo.id)||salvo);');
 // Reopening a saved quote is not consent to reprice its historical lines.
 replace('orcamento=itens.map(x=>aplicarCobrancaOrcamento(x));','orcamento=itens.map(x=>aplicarCobrancaOrcamento(x.autoPriceV1?{...x,autoPriceV1:{...x.autoPriceV1,locked:true}}:x));');
 replace('  if(historicoTipo===\'m2\')renderHistoricoPlanilhasM2();\n  else if(historicoTipo===\'granel\')renderHistoricoPlanilhasGranel();\n  else renderHistoricoPlanilhasM3();','  renderMovementDaysV710();');
 replace("function pcBuscarEspecie(q){","function pcBuscarEspecie(q){\n  if(document.getElementById('estoqueHistoricoPainel')?.classList.contains('ativo')){movementFiltersV710.search=String(q??document.getElementById('pcBuscaEspecie')?.value??'').trim();renderMovementDaysV710();return document.querySelectorAll('.movement-day-v710').length;}");
 replace(' document.body.appendChild(area);',' compactPrintClone(c,{detailed:window.__v456Local.getItem("compact_pdf_details_v712")==="true"});\n document.body.appendChild(area);');
 app=app.replace(/<body([^>]*)>/, '<body$1><aside class="no-print" style="padding:10px;background:#fff0ca;color:#493b19;font:14px system-ui">Prévia para testes. Use documentos de teste e preserve os registros da empresa.</aside>');
 app=app.replace('</head>','<style id="preview-layout-v710">'+read('ui/preview-layout.css')+'</style></head>');
 return html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){const path=process.argv[2]||new URL('../public/index.html',import.meta.url);writeFileSync(path,applyPendingPreview(readFileSync(path,'utf8')));console.log('Prévia: precificação, movimentações e impressão compacta preparadas.');}
