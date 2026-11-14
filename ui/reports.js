// REPORTS_V722 — independent navigation; finance remains exclusive to the company owner.
let reportsViewV722='stock';
function selectReportsViewV722(view){
 const section=document.getElementById('relatorios');if(!section?.classList.contains('active'))return;
 const owner=finOwnerV722(),stockAllowed=stockChartsAllowedV720();
 if(view==='finance'&&!owner)return;if(view==='stock'&&!stockAllowed)return;reportsViewV722=view;
 const physical=document.getElementById('stockChartsV720'),financial=document.getElementById('financePanelV722');
 physical.hidden=view!=='stock'||!stockAllowed;financial.hidden=view!=='finance'||!owner;
 for(const button of section.querySelectorAll('[data-report-view]')){button.hidden=button.dataset.reportView==='finance'&&!owner;button.setAttribute('aria-pressed',String(button.dataset.reportView===view));}
 if(view==='stock'){physical.open=true;abrirHistoricoMovimentosV701();queueStockChartsV720();}
 else if(!financeBusyV722)financeLoadV722();
}
function mountReportsV722(){
 const section=document.getElementById('relatorios');if(!section)return;
 for(const button of section.querySelectorAll('[data-report-view]')){button.hidden=button.dataset.reportView==='finance'&&!finOwnerV722();button.addEventListener('click',()=>selectReportsViewV722(button.dataset.reportView));}
 let wasActive=section.classList.contains('active');new MutationObserver(()=>{const active=section.classList.contains('active');if(active&&!wasActive)selectReportsViewV722(reportsViewV722);wasActive=active;}).observe(section,{attributes:true,attributeFilter:['class']});
 if(section.classList.contains('active'))selectReportsViewV722(reportsViewV722);
}
setTimeout(mountReportsV722,0);
