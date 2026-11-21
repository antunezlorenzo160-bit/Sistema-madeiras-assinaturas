// V718: simplify live sheets only. Move/keep live rows, preserving every handler.
function setSheetFooterV718(anchor,id,lines){
 if(!anchor)return;
 let foot=document.getElementById(id);
 if(!lines.length){foot?.remove();return;}
 if(!foot){foot=document.createElement('section');foot.id=id;foot.className='sheet-final-totals-v718';anchor.after(foot);}
 foot.replaceChildren();const title=document.createElement('h3');title.textContent='Totais por espécie e espessura';foot.append(title);
 for(const text of lines){const p=document.createElement('p');p.textContent=text;foot.append(p);}
}
function compactSummarySheetV718(){
 const body=document.getElementById('tbLancamentos');if(!body||body.firstElementChild?.dataset.sheetV718==='1')return;
 body.querySelectorAll('.resumo-total-espessura').forEach(r=>r.remove());
 if(body.firstElementChild)body.firstElementChild.dataset.sheetV718='1';
 setSheetFooterV718(body.closest('.table-wrap'),'summaryFooterV718',sheetItemTotals(fonteResumoAtual()).map(g=>g.text));
}
function compactBudgetSheetV718(){
 const body=document.getElementById('tbOrcamento');if(!body||body.firstElementChild?.dataset.sheetV718==='1')return;
 for(const row of body.querySelectorAll('.orc-tipo-subtotal')){
  const label=row.querySelector('.orc-subtotal-label'),value=row.querySelector('.v229-total-volume-valor');if(!label||!value)continue;
  const original=label.textContent.toLowerCase();const kind=original.includes('granel')?'granel':original.includes('linear')?'linear':original.includes('m²')?'m2':'m3';
  const total=orcamento.filter(i=>(i.tipoMedida||'m3')===kind).reduce((n,i)=>n+Number(i.volume||0),0);
  label.textContent=kind==='m2'?'Área total do bloco':kind==='linear'?'Metragem total do bloco':'Volume total do bloco';
  value.textContent=(['m3','granel'].includes(kind)?num4(total):num2(total))+' '+(kind==='m2'?'m²':kind==='linear'?'m':'m³');
 }
 if(body.firstElementChild)body.firstElementChild.dataset.sheetV718='1';
 setSheetFooterV718(body.closest('.table-wrap'),'budgetFooterV718',sheetItemTotals(orcamento,true).map(g=>g.text));
}
function compactLoadSheetsV718(){
 const host=document.getElementById('carregamentos');if(!host)return;
 const sheets=host.querySelectorAll('.v392-planilha,.v399-copia-painel');
 sheets.forEach((sheet,index)=>{
  for(const wrap of sheet.querySelectorAll('.table-wrap')){
   if(wrap.dataset.sheetV718==='1')continue;
   const tables=[...wrap.querySelectorAll('table.v404-carga-tabela')];if(!tables.length)continue;
   const data=tables.map(t=>{const heads=[...t.tHead?.rows||[]];return {title:heads.slice(0,-1).map(r=>r.textContent.trim()).join(' '),subtotal:t.querySelector('.v599-total-medida')?.textContent.trim()||'',headers:[...(heads.at(-1)?.cells||[])].map(c=>c.textContent.trim()),rows:[...t.tBodies].flatMap(b=>[...b.rows]).filter(r=>[...r.cells].every(c=>c.colSpan===1)).map(r=>[...r.cells].map(c=>c.textContent.trim()))};});
   const totals=compactLoadGroups(data).flatMap(g=>g.totals);
   wrap.querySelectorAll('.v404-carga-subtotal:not(.v599-total-medida)').forEach(r=>r.remove());
   wrap.dataset.sheetV718='1';
   let foot=wrap.nextElementSibling;if(!foot?.classList.contains('sheet-final-totals-v718')){foot=document.createElement('section');foot.className='sheet-final-totals-v718';wrap.after(foot);}
   const title=document.createElement('h3');title.textContent='Totais por espécie e espessura';foot.replaceChildren(title);
   for(const text of totals){const p=document.createElement('p');p.textContent=text;foot.append(p);}
  }
 });
}
setTimeout(()=>{
 for(const [id,update] of [['tbLancamentos',compactSummarySheetV718],['tbOrcamento',compactBudgetSheetV718],['carregamentos',compactLoadSheetsV718]]){
  const element=document.getElementById(id);if(!element)continue;
  let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;update();});}).observe(element,{childList:true,subtree:true});
  update();
 }
},0);
