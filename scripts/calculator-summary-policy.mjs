// Summaries show physical measures and services; pricing remains in the full quote.
export function applyCalculatorSummaryPolicy(app){
 if(app.includes('/* calculator-summary-no-prices-v1 */'))return app;
 function edit(name,transform){
  const start=app.indexOf('function '+name+'(');if(start<0)throw new Error('Summary function missing: '+name);
  let end=app.indexOf('\nfunction ',start+10);if(end<0)throw new Error('Summary boundary missing: '+name);
  app=app.slice(0,start)+transform(app.slice(start,end))+app.slice(end);
 }
 edit('renderLancamentos',s=>s.replaceAll('<td>preço/m³</td>','<td></td>').replaceAll('<td>preço/m</td>','<td></td>').replaceAll('<td>${moeda(x.preco)}/m³</td>','<td></td>').replaceAll('<td>${moeda(x.preco)}/m</td>','<td></td>'));
 edit('pcPlanilhaLinearHtml',s=>s.replace("function pcPlanilhaLinearHtml(arr,titulo,orc=false,semValor=false){","function pcPlanilhaLinearHtml(arr,titulo,orc=false,semValor=false){\n /* calculator-summary-no-prices-v1 */")
  .replace("+(semValor?'':'<td>'+moeda(x.valor)+'</td>')",'')
  .replace("+(semValor?'':'<th>Valor</th>')",'')
  .replace("+(semValor?'':'<div><small>Valor total</small><strong>'+moeda(valor)+'</strong></div>')",''));
 edit('pcPlanilhaHtml',s=>s.replace('tipoForcado=null){','tipoForcado=null){\n semValor=true;'));
 edit('pcPlanilhaOrcamentoHtml',s=>s.replaceAll('<td>${moeda(x.valor)}</td>','').replaceAll('<th>valor</th>','').replaceAll("tipo==='m2'?6:7","tipo==='m2'?5:6"));
 return app;
}
