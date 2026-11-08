// COMPANY_FINANCE_V722 — manual records; owner-only server endpoints; no stock writes.
let financeRowsV722=[],financeLoadedRangeV722=null,financeCanWriteV722=false,financeBusyV722=false,financeSequenceV722=0,financeEditV722=null,financeDraftIdV722=null;
const finElV722=id=>document.getElementById(id),finOwnerV722=()=>parent.__smEmployeeMember?.()?.papel==='admin';
const finMoneyV722=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function finStatusV722(text){finElV722('finStatusV722').textContent=text;}
function financeNewV722(){
 financeEditV722=null;financeDraftIdV722=crypto.randomUUID();finElV722('finFormV722').reset();const d=new Date();finElV722('finDateV722').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 finElV722('finSaveV722').textContent='Salvar lançamento';finElV722('finCostLabelV722').hidden=true;
}
function finWriteStateV722(){for(const field of finElV722('finFormV722').querySelectorAll('input,select,button'))field.disabled=financeBusyV722||!financeCanWriteV722;finElV722('finLoadV722').disabled=financeBusyV722;finElV722('finGroupV722').disabled=financeBusyV722;}
async function financeRequestV722(input,range,endpoint='company-finance'){
 if(!finOwnerV722())throw Error('O financeiro é exclusivo do responsável pela empresa.');
 if(!navigator.onLine)throw Error('Conecte-se à internet. O formulário foi preservado.');
 const user=authV456.currentUser;if(!user)throw Error('Entre novamente com sua conta.');
 const response=await fetch('/.netlify/functions/'+endpoint+(range?'?'+new URLSearchParams(range):''),{method:input?'POST':'GET',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),signal:AbortSignal.timeout(20000),cache:'no-store'});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível acessar o financeiro.');
 if(authV456.currentUser?.uid!==user.uid||data.empresaId!==empresaV456||!finOwnerV722())throw Error('A sessão mudou. Entre novamente.');return data;
}
function financeRenderV722(){
 if(!finOwnerV722()||!financeLoadedRangeV722)return;
 financeRowsV722=reviewLoadSaleDuplicates(financeRowsV722);
 const range={...financeLoadedRangeV722,group:finElV722('finGroupV722').value};let report;
 try{report=aggregateFinance(financeRowsV722,range);}catch(e){finElV722('finNumbersV722').hidden=true;finStatusV722(e.message);return;}
 const t=report.total;finElV722('finNumbersV722').hidden=false;finElV722('finShownPeriodV722').textContent='Valores exibidos: '+stockChartLabelV720(range.from)+' a '+stockChartLabelV720(range.to)+'.';
 const stats=[['Compras',t.purchase],[t.pendingSales?'Vendas (parcial)':'Vendas',t.sale],[t.pendingCosts?'Custo das vendas (parcial)':'Custo da madeira vendida',t.cost],['Despesas',t.expense],['Perdas',t.loss],['Resultado dos registros',t.result]];
 finElV722('finStatsV722').innerHTML=stats.map(([label,value])=>'<div><small>'+label+'</small><strong class="'+(value!==null&&value<0?'fin-negative':'')+'">'+(value===null?'Pendente':finMoneyV722(value))+'</strong></div>').join('');
 finElV722('finPendingV722').textContent=t.pendingSales?t.pendingSales+' carga(s) aguardando conferência de possível venda manual duplicada. O resultado fica pendente até resolver.':t.pendingCosts?t.pendingCosts+' venda(s) sem custo informado. Complete o custo para calcular lucro ou prejuízo.':t.count?'Resultado calculado somente com os registros deste período. Não representa dinheiro recebido ou saldo bancário.':'Ainda não há lançamentos ou cargas baixadas neste período.';
 const used=report.rows.filter(r=>r.count),maximum=Math.max(1,...used.flatMap(r=>[r.purchase,r.sale,r.expense,r.loss]));
 finElV722('finChartV722').innerHTML=used.length?'<h4>Valores por período</h4>'+used.map(row=>'<article class="fin-period-chart"><h4>'+stockChartLabelV720(row.key)+'</h4>'+[['sale','Vendas'],['purchase','Compras'],['expense','Despesas'],['loss','Perdas']].map(([key,label])=>'<div class="fin-chart-label"><span>'+label+'</span><strong>'+finMoneyV722(row[key])+'</strong></div><div class="fin-track"><span class="fin-bar-'+key+'" style="width:'+(row[key]/maximum*100)+'%"></span></div>').join('')+'<p class="note">Resultado: '+(row.result===null?'pendente de custo':finMoneyV722(row.result))+'</p></article>').join(''):'<p class="empty">Os gráficos aparecem quando houver lançamentos no período.</p>';
 finElV722('finPeriodTableV722').innerHTML='<table><thead><tr><th>Período</th><th>Compras</th><th>Vendas</th><th>Custo das vendas</th><th>Despesas</th><th>Perdas</th><th>Resultado</th></tr></thead><tbody>'+report.rows.map(row=>'<tr><td>'+stockChartLabelV720(row.key)+'</td>'+['purchase','sale','cost','expense','loss','result'].map(key=>'<td>'+(row[key]===null?'Pendente':finMoneyV722(row[key]))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 finElV722('finEntriesV722').innerHTML=financeRowsV722.length?financeRowsV722.map(row=>'<article class="fin-entry'+(row.status==='cancelled'?' fin-cancelled':'')+'"><div><strong>'+esc(FINANCE_TYPES[row.type]||row.type)+' · '+stockChartLabelV720(row.date)+' · '+finMoneyV722(row.amountCents)+'</strong><p>'+esc(row.description)+'</p><small>'+esc([row.partner,FINANCE_CATEGORIES[row.category],row.reference].filter(Boolean).join(' · '))+'</small>'+(row.type==='sale'?'<p class="note">Custo da madeira vendida: '+(row.costCents===null?'pendente':finMoneyV722(row.costCents))+'</p>':'')+'</div>'+(row.source?.type==='load-sale'?financeLoadSaleActionsV724(row):row.status==='cancelled'?'<strong>Cancelado</strong>':row.source?.type==='load-transport'?'<p class="note">Vinculado ao carregamento. Altere em Gastos do transporte.</p>':financeCanWriteV722?'<div class="fin-actions"><button type="button" class="btn btn-secondary" data-fin-edit="'+esc(row.id)+'">Editar</button><button type="button" class="btn btn-danger" data-fin-cancel="'+esc(row.id)+'">Cancelar registro</button></div>':'')+'</article>').join(''):'<p class="empty">Nenhum lançamento neste período.</p>';
}
async function financeLoadV722(){
 if(!finOwnerV722()||financeBusyV722)return;
 const from=finElV722('finFromV722').value,to=finElV722('finToV722').value;
 if(stockChartDate(from)!==from||stockChartDate(to)!==to||from>to){finStatusV722('Confira as datas da consulta.');return;}
 const sequence=++financeSequenceV722;financeBusyV722=true;finWriteStateV722();finStatusV722('Consultando lançamentos…');
 try{const result=await financeRequestV722(null,{from,to});if(sequence!==financeSequenceV722)return;financeRowsV722=result.entries;financeLoadedRangeV722={from,to};financeCanWriteV722=result.canWrite===true;finElV722('finPreviewV722').hidden=result.preview!==true;financeRenderV722();finStatusV722((result.canWrite?'':'Acesso somente para consulta. ')+stockChartLabelV720(from)+' a '+stockChartLabelV720(to)+' · '+result.entries.length+' registro(s).');}
 catch(e){finStatusV722(e.name==='TimeoutError'?'A consulta demorou. Tente novamente.':e.message);}
 finally{financeBusyV722=false;finWriteStateV722();}
}
function financeEntryV722(){return normalizeFinanceEntry({id:financeEditV722?.id||financeDraftIdV722,revision:financeEditV722?.revision||0,type:finElV722('finTypeV722').value,date:finElV722('finDateV722').value,description:finElV722('finDescriptionV722').value,partner:finElV722('finPartnerV722').value,reference:finElV722('finReferenceV722').value,category:finElV722('finCategoryV722').value,amountCents:financeCents(finElV722('finAmountV722').value),costCents:finElV722('finTypeV722').value==='sale'&&finElV722('finCostV722').value.trim()!==''?financeCents(finElV722('finCostV722').value):null});}
async function financeSaveV722(event){
 event.preventDefault();if(financeBusyV722||!financeCanWriteV722||!finOwnerV722())return;
 let entry;try{entry=financeEntryV722();}catch(e){finElV722('finWriteStatusV722').textContent=e.message;return;}
 financeBusyV722=true;finWriteStateV722();finElV722('finWriteStatusV722').textContent='Salvando lançamento…';
 try{const result=await financeRequestV722({action:'save',entry});financeEditV722=result.entry;finElV722('finSaveV722').textContent='Salvar alterações';
  financeRowsV722=financeRowsV722.filter(row=>row.id!==result.entry.id);if(financeLoadedRangeV722&&result.entry.date>=financeLoadedRangeV722.from&&result.entry.date<=financeLoadedRangeV722.to)financeRowsV722.unshift(result.entry);financeRenderV722();finElV722('finWriteStatusV722').textContent='Lançamento salvo.'+(financeLoadedRangeV722&&(result.entry.date<financeLoadedRangeV722.from||result.entry.date>financeLoadedRangeV722.to)?' Consulte o período da data registrada para vê-lo no gráfico.':'');
 }catch(e){finElV722('finWriteStatusV722').textContent=(e.name==='TimeoutError'?'A resposta demorou. Tente salvar novamente com os mesmos dados.':e.message)+' O formulário foi preservado.';}
 finally{financeBusyV722=false;finWriteStateV722();}
}
async function financeCancelV722(id){
 if(financeBusyV722||!financeCanWriteV722||!finOwnerV722())return;
 const row=financeRowsV722.find(r=>r.id===id);if(row?.source)return;if(!row||!confirm('Cancelar este registro de '+finMoneyV722(row.amountCents)+'? Ele será preservado, mas sairá dos cálculos.'))return;
 financeBusyV722=true;finWriteStateV722();
 try{const result=await financeRequestV722({action:'cancel',entry:{id:row.id,revision:row.revision}});financeRowsV722=financeRowsV722.map(r=>r.id===id?result.entry:r);if(financeEditV722?.id===id)financeNewV722();financeRenderV722();finStatusV722('Registro cancelado e preservado no histórico.');}catch(e){finStatusV722(e.message);}finally{financeBusyV722=false;finWriteStateV722();}
}
function mountFinanceV722(){
 const panel=finElV722('financePanelV722');if(!panel||!finOwnerV722())return;
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1),day=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');finElV722('finFromV722').value=day(start);finElV722('finToV722').value=day(now);financeNewV722();finWriteStateV722();
 finElV722('finLoadV722').onclick=financeLoadV722;finElV722('finGroupV722').onchange=financeRenderV722;
 for(const id of ['finFromV722','finToV722'])finElV722(id).onchange=()=>finStatusV722('Toque em Consultar período para atualizar os valores.');
 finElV722('finTypeV722').onchange=()=>{finElV722('finCostLabelV722').hidden=finElV722('finTypeV722').value!=='sale';};finElV722('finFormV722').onsubmit=financeSaveV722;
 finElV722('finNewV722').onclick=()=>{financeNewV722();finElV722('finWriteStatusV722').textContent='Novo lançamento.';};
 panel.addEventListener('change',event=>{const select=event.target.closest('[data-load-sale-manual]');if(!select)return;const root=select.closest('[data-load-sale]'),manual=financeRowsV722.find(entry=>entry.id===select.value),cost=root.querySelector('[data-load-sale-cost]');if(manual?.costCents!==null&&manual?.costCents!==undefined&&!cost.value.trim())cost.value=(manual.costCents/100).toFixed(2).replace('.',',');});
 panel.addEventListener('click',event=>{const save=event.target.closest('[data-load-sale-save]');if(save){financeSaveLoadSaleV724(save.closest('[data-load-sale]'));return;}const edit=event.target.closest('[data-fin-edit]'),cancel=event.target.closest('[data-fin-cancel]');if(cancel){financeCancelV722(cancel.dataset.finCancel);return;}if(!edit||financeBusyV722||!financeCanWriteV722)return;
  const row=financeRowsV722.find(r=>r.id===edit.dataset.finEdit);if(!row||row.source)return;financeEditV722={...row};for(const [id,key] of [['finTypeV722','type'],['finDateV722','date'],['finDescriptionV722','description'],['finPartnerV722','partner'],['finReferenceV722','reference'],['finCategoryV722','category']])finElV722(id).value=row[key]||'';
  finElV722('finAmountV722').value=(row.amountCents/100).toFixed(2).replace('.',',');finElV722('finCostV722').value=row.costCents===null?'':(row.costCents/100).toFixed(2).replace('.',',');finElV722('finCostLabelV722').hidden=row.type!=='sale';finElV722('finSaveV722').textContent='Salvar alterações';finElV722('finEntryBoxV722').open=true;finElV722('finEntryBoxV722').scrollIntoView({block:'start',behavior:'smooth'});
 });
}
setTimeout(mountFinanceV722,0);
function financeLoadSaleActionsV724(row){
 const source=row.source,warnings=[];
 if(row.status==='pending-review')warnings.push('Existe venda manual com a mesma data e valor. Escolha abaixo se é a mesma venda ou outra venda. Esta carga ainda não foi somada para evitar duplicidade.');
 if(source.costRequiresReview)warnings.push('As peças ou quantidades mudaram. Informe novamente o custo da madeira vendida.');
 if(source.zeroValueLines)warnings.push(source.zeroValueLines+' item(ns) sem valor de venda. Confira os preços no carregamento.');
 if(source.manualEntryId)warnings.push('Esta carga substitui um lançamento manual anterior, preservado como cancelado.');
 const manual=(source.possibleManualIds||[]).map(id=>financeRowsV722.find(entry=>entry.id===id)).filter(Boolean),disabled=financeCanWriteV722?'':' disabled';
 return '<details class="fin-load-sale-v724" data-load-sale="'+esc(row.id)+'"><summary>'+(row.status==='cancelled'?'Carga fora das vendas':'Venda vinculada à carga — conferir custo')+'</summary><p class="note">Total do documento original: '+finMoneyV722(row.amountCents)+' (produtos − desconto + frete e outros valores cobrados). O valor se atualiza pelo carregamento; a cópia comercial não é outra venda.</p>'+warnings.map(text=>'<p class="note">'+esc(text)+'</p>').join('')+'<label><input type="checkbox" data-load-sale-include'+(row.status!=='cancelled'?' checked':'')+disabled+'> Considerar esta carga como venda</label><label>Custo da madeira vendida (R$)<input type="text" inputmode="decimal" data-load-sale-cost value="'+(row.costCents===null?'':(row.costCents/100).toFixed(2).replace('.',','))+'" placeholder="Vazio = resultado pendente"'+disabled+'></label><p class="note">Informe somente o custo dos produtos vendidos. Gastos do transporte já registrados não devem ser repetidos nesse custo.</p>'+(manual.length?'<label>Conferir venda manual<select data-load-sale-manual'+disabled+'><option value="__choose__">Escolha para evitar duplicidade</option><option value="__separate__">É outra venda; considerar as duas</option>'+(!source.manualEntryId?manual.map(entry=>'<option value="'+esc(entry.id)+'">Substituir: '+esc(entry.description)+' — '+finMoneyV722(entry.amountCents)+'</option>').join(''):'')+'</select></label><p class="note">Ao substituir, o lançamento manual é cancelado e preservado no histórico. A venda da carga passa a contar uma única vez.</p>':'')+'<button type="button" class="btn btn-primary" data-load-sale-save'+disabled+'>Salvar custo / conferência</button><p class="note" data-load-sale-status role="status"></p></details>';
}
async function financeSaveLoadSaleV724(root){
 if(financeBusyV722||!finOwnerV722()||!financeCanWriteV722)return;
 const row=financeRowsV722.find(entry=>entry.id===root.dataset.loadSale);if(!row||row.source?.type!=='load-sale')return;
 const status=root.querySelector('[data-load-sale-status]'),select=root.querySelector('[data-load-sale-manual]'),choice=select?.value;
 if(choice==='__choose__'){status.textContent='Escolha se o lançamento manual representa esta mesma venda ou outra venda.';return;}
 const manual=choice&&choice!=='__separate__'?financeRowsV722.find(entry=>entry.id===choice):null;
 let cost;try{const raw=root.querySelector('[data-load-sale-cost]').value.trim();cost=raw===''?null:financeCents(raw);}catch(e){status.textContent=e.message;return;}
 const include=root.querySelector('[data-load-sale-include]').checked;
 if(manual&&!include){status.textContent='Marque a carga como venda para substituir o lançamento manual.';return;}
 financeBusyV722=true;finWriteStateV722();for(const field of root.querySelectorAll('input,select,button'))field.disabled=true;status.textContent='Salvando custo e conferência…';
 try{
  const result=await financeRequestV722({loadId:row.source.loadId,revision:row.revision,signature:row.source.signature,include,costCents:cost,manualEntry:manual?{id:manual.id,revision:manual.revision}:null,resolution:manual?'replace':choice==='__separate__'?'separate':row.source.separateConfirmed?'separate':'none'},null,'company-load-sale');
  financeRowsV722=financeRowsV722.map(entry=>entry.id===result.entry.id?result.entry:result.manualEntry&&entry.id===result.manualEntry.id?result.manualEntry:entry);financeRenderV722();finStatusV722('Custo e conferência da venda salvos. O valor da venda continua vinculado ao carregamento original.');
 }catch(e){status.textContent=e.message+' Os campos foram preservados.';}
 finally{financeBusyV722=false;finWriteStateV722();for(const field of root.querySelectorAll('input,select,button'))field.disabled=!financeCanWriteV722;}
}
