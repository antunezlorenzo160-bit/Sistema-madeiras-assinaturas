// V831: data is saved synchronously; only painting is coalesced after the input reset.
let launchPaintFrameV831=null;
const launchPaintDestinationsV831=new Set();
function stableCalculatorHtmlV831(node,html){
 if(!node||node.__calculatorHtmlV831===html)return;
 node.innerHTML=html;node.__calculatorHtmlV831=html;
}
function flushLaunchPaintV831(){
 if(launchPaintFrameV831!==null){cancelAnimationFrame(launchPaintFrameV831);launchPaintFrameV831=null;}
 if(lotePacotesEmCurso||!launchPaintDestinationsV831.size)return;
 const destinations=[...launchPaintDestinationsV831];launchPaintDestinationsV831.clear();
 const render=(name,selector,fn)=>{try{if(!diferirRenderizacaoV595(name,selector,fn))fn();}catch(e){console.error(name,e);}};
 render('renderLancamentos','#calculadora',renderLancamentos);
 if(destinations.includes('orcamento')){
  render('renderOrcamento','#orcamento',renderOrcamento);
  try{pcAtualizarPlanilhaDirecionada();}catch(e){}
 }
 if(destinations.some(d=>['orcamento','estoque1','estoque2','transferencia','carga','plaina'].includes(d))){
  render('renderPlanilhasM3Especies','#estoquePrincipalPainel',renderPlanilhasM3Especies);
 }
 if(destinations.some(d=>['estoque1','estoque2','transferencia','carga','plaina'].includes(d))){
  render('renderEstoqueLancamentos','#estoquePrincipalPainel .painel-estoque-lanc.ativo',renderEstoqueLancamentos);
  render('renderEstoque','#tbEstoque',renderEstoque);
  render('renderHistoricoPlanilhasEstoque','#estoqueHistoricoPainel',renderHistoricoPlanilhasEstoque);
 }
}
function atualizarTelasAposLancamento(destino){
 if(lotePacotesEmCurso)return;
 // Preserve the original persistence boundary, including the load's prior durable save.
 if(destino!=='carga')save();
 launchPaintDestinationsV831.add(destino);
 if(typeof queueStockChartsV720==='function')queueStockChartsV720();
 if(launchPaintFrameV831===null)launchPaintFrameV831=requestAnimationFrame(()=>{launchPaintFrameV831=requestAnimationFrame(flushLaunchPaintV831);});
}
window.addEventListener('beforeprint',flushLaunchPaintV831);
document.addEventListener('click',event=>{
 if(event.target?.closest?.('[id*="PDF"],[id*="Pdf"],[id*="Copiar"],[onclick*="PDF"],[onclick*="pdf"],[onclick*="copiar"]'))flushLaunchPaintV831();
},true);
