// REPORTS_V722 — independent navigation; finance remains exclusive to the company owner.
let reportsViewV722='stock';
function selectReportsViewV722(view){
 const section=document.getElementById('relatorios');if(!section?.classList.contains('active'))return;
 const owner=finOwnerV722(),stockAllowed=stockChartsAllowedV720();
 if(!['stock','finance','cash'].includes(view))return;
 const physical=document.getElementById('stockChartsV720'),financial=document.getElementById('financePanelV722'),cash=document.getElementById('cashPanelV759');
 if(!owner){financial.hidden=true;if(cash)cash.hidden=true;if(view!=='stock')view='stock';}
 if(view==='stock'&&!stockAllowed)return;reportsViewV722=view;
 physical.hidden=view!=='stock'||!stockAllowed;financial.hidden=view!=='finance'||!owner;if(cash)cash.hidden=view!=='cash'||!owner;
 for(const button of (document.getElementById('reportsViewBarV812')||section).querySelectorAll('[data-report-view]')){button.hidden=['finance','cash'].includes(button.dataset.reportView)&&!owner;button.setAttribute('aria-pressed',String(button.dataset.reportView===view));}
 if(view==='stock'){physical.open=true;abrirHistoricoMovimentosV701();queueStockChartsV720();}
 else if(view==='cash'){mountCashV759();cashLoadV759();}else if(!financeBusyV722)financeLoadV722();
}
function mountReportsV722(){
 const section=document.getElementById('relatorios');if(!section)return;
 for(const button of (document.getElementById('reportsViewBarV812')||section).querySelectorAll('[data-report-view]')){button.hidden=['finance','cash'].includes(button.dataset.reportView)&&!finOwnerV722();button.addEventListener('click',()=>selectReportsViewV722(button.dataset.reportView));}
 const updateDock=mountReportsDockV812(section);
 let wasActive=section.classList.contains('active');new MutationObserver(()=>{const active=section.classList.contains('active');updateDock();if(active&&!wasActive)selectReportsViewV722(reportsViewV722);wasActive=active;}).observe(section,{attributes:true,attributeFilter:['class']});
 if(section.classList.contains('active'))selectReportsViewV722(reportsViewV722);
}
setTimeout(mountReportsV722,0);

// Use the existing fixed header and mobile content scroller, without per-scroll work.
function mountReportsDockV812(section){
 const bar=document.getElementById('reportsViewBarV812'),header=document.querySelector('header .tabs')?.closest('header')||document.querySelector('body>header,#homeShellV492>header');
 if(!bar||!header||typeof window.matchMedia!=='function')return ()=>{};
 const home=bar.parentNode,anchor=bar.nextSibling,media=window.matchMedia('(max-width:760px)');
 const update=()=>{
  const docked=media.matches&&section.classList.contains('active');
  if(docked&&bar.parentNode!==header)header.appendChild(bar);
  else if(!docked&&bar.parentNode!==home)home.insertBefore(bar,anchor&&anchor.parentNode===home?anchor:null);
  bar.classList.toggle('reports-docked-v812',docked);
 };
 if(media.addEventListener)media.addEventListener('change',update);else media.addListener?.(update);
 update();return update;
}
