// COMPANY_FINANCE_V722 — manual records; owner-only server endpoints; no stock writes.
let financeProfitPolicyV726={minimumBasisPoints:null,revision:0};
let financeRowsV722=[],financeLoadedRangeV722=null,financeCanWriteV722=false,financeBusyV722=false,financeSequenceV722=0,financeEditV722=null,financeDraftIdV722=null;
const finElV722=id=>document.getElementById(id),finOwnerV722=()=>parent.__smEmployeeMember?.()?.papel==='admin';
const finMoneyV722=cents=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function finStatusV722(text){finElV722('finStatusV722').textContent=text;}
function financeNewV722(){
 financeEditV722=null;financeDraftIdV722=crypto.randomUUID();finElV722('finFormV722').reset();const d=new Date();finElV722('finDateV722').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 finElV722('finSaveV722').textContent='Salvar lançamento';finElV722('finCostLabelV722').hidden=true;
}
function finWriteStateV722(){for(const field of finElV722('finFormV722').querySelectorAll('input,select,button'))field.disabled=financeBusyV722||!financeCanWriteV722;finElV722('finLoadV722').disabled=financeBusyV722;finElV722('finGroupV722').disabled=financeBusyV722;for(const id of ['finMinimumPercentV726','finMinimumSaveV726']){const field=finElV722(id);if(field)field.disabled=financeBusyV722||!financeCanWriteV722;}}
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
 const minimum=assessMinimumProfitPeriod(financeRowsV722.filter(row=>row.date>=range.from&&row.date<=range.to),t,financeProfitPolicyV726);
 financeMinimumSummaryV726(minimum);
 const serviceRows=financeRowsV722.filter(row=>row.type==='sale'&&row.status==='active'&&row.source?.type==='load-sale'&&row.date>=range.from&&row.date<=range.to),servicePending=serviceRows.some(row=>row.source.pendingServiceLines>0||row.source.serviceCents===null),serviceTotal=serviceRows.reduce((sum,row)=>sum+(row.source.serviceCents||0),0);
 const stats=[...(serviceTotal||servicePending?[[servicePending?'Serviços nas cargas (separação pendente)':'Serviços incluídos nas vendas',servicePending?null:serviceTotal]]:[]),['Compras',t.purchase],[t.pendingSales?'Vendas (parcial)':'Vendas',t.sale],[t.pendingCosts?'Custo das vendas (parcial)':'Custo da madeira vendida',t.cost],['Margem antes das despesas',t.grossMargin],...(minimum.enabled?[['Lucro mínimo esperado',minimum.requiredCents]]:[]),['Despesas',t.expense],...(t.loss>0?[['Perdas de madeira / material',t.loss]]:[]),['Lucro do período',t.profit,t.profit>0?'fin-positive':''],['Prejuízo do período',t.deficit,t.deficit>0?'fin-negative':'']];
 finElV722('finStatsV722').innerHTML=stats.map(([label,value,color])=>'<div><small>'+label+'</small><strong class="'+(color||(value!==null&&value<0?'fin-negative':''))+'">'+(value===null?'Pendente':finMoneyV722(value))+'</strong></div>').join('');
 finElV722('finPendingV722').textContent=financeOutcomeMessageV725(t);
 const graphSeries=[['sale','Vendas'],['purchase','Compras'],['expense','Despesas'],...(t.loss>0?[['loss','Perdas de madeira / material']]:[]),['profit','Lucro'],['deficit','Prejuízo']];
 const used=report.rows.filter(r=>r.count||r.pendingSales),maximum=Math.max(1,...used.flatMap(r=>graphSeries.map(([key])=>r[key]||0)));
 finElV722('finChartV722').innerHTML=used.length?'<h4>Valores por período</h4>'+used.map(row=>'<article class="fin-period-chart"><h4>'+stockChartLabelV720(row.key)+'</h4>'+graphSeries.map(([key,label])=>'<div class="fin-chart-label"><span>'+label+'</span><strong>'+(row[key]===null?'Pendente':finMoneyV722(row[key]))+'</strong></div><div class="fin-track"><span class="fin-bar-'+key+'" style="width:'+((row[key]||0)/maximum*100)+'%"></span></div>').join('')+'<p class="note">Margem antes das despesas: '+(row.grossMargin===null?'pendente':finMoneyV722(row.grossMargin))+'</p></article>').join(''):'<p class="empty">Os gráficos aparecem quando houver lançamentos no período.</p>';
 const columns=[['purchase','Compras'],['sale','Vendas'],['cost','Custo das vendas'],['grossMargin','Margem antes das despesas'],['expense','Despesas'],...(t.loss>0?[['loss','Perdas de madeira / material']]:[]),['profit','Lucro'],['deficit','Prejuízo']];
 finElV722('finPeriodTableV722').innerHTML='<table><thead><tr><th>Período</th>'+columns.map(([,label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+report.rows.map(row=>'<tr><td>'+stockChartLabelV720(row.key)+'</td>'+columns.map(([key])=>'<td>'+(row[key]===null?'Pendente':finMoneyV722(row[key]))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 finElV722('finEntriesV722').innerHTML=financeRowsV722.length?financeRowsV722.map(row=>'<article class="fin-entry'+(row.status==='cancelled'?' fin-cancelled':'')+'"><div><strong>'+esc(FINANCE_TYPES[row.type]||row.type)+' · '+stockChartLabelV720(row.date)+' · '+finMoneyV722(row.amountCents)+'</strong><p>'+esc(row.description)+'</p><small>'+esc([row.partner,FINANCE_CATEGORIES[row.category],row.reference].filter(Boolean).join(' · '))+'</small>'+(row.type==='sale'?'<p class="note">Custo da madeira vendida: '+(row.costCents===null?'pendente':finMoneyV722(row.costCents))+'</p>':'')+'</div>'+financeSaleMinimumV726(row)+(row.source?.type==='load-sale'?financeLoadSaleActionsV724(row):row.status==='cancelled'?'<strong>Cancelado</strong>':row.source?.type==='load-transport'?'<p class="note">Vinculado ao carregamento. Altere em Gastos do transporte.</p>':financeCanWriteV722?'<div class="fin-actions"><button type="button" class="btn btn-secondary" data-fin-edit="'+esc(row.id)+'">Editar</button><button type="button" class="btn btn-danger" data-fin-cancel="'+esc(row.id)+'">Cancelar registro</button></div>':'')+'</article>').join(''):'<p class="empty">Nenhum lançamento neste período.</p>';
}
async function financeLoadV722(){
 if(!finOwnerV722()||financeBusyV722)return;
 const from=finElV722('finFromV722').value,to=finElV722('finToV722').value;
 if(stockChartDate(from)!==from||stockChartDate(to)!==to||from>to){finStatusV722('Confira as datas da consulta.');return;}
 const sequence=++financeSequenceV722;financeBusyV722=true;finWriteStateV722();finStatusV722('Consultando lançamentos…');
 try{const result=await financeRequestV722(null,{from,to});if(sequence!==financeSequenceV722)return;financeRowsV722=result.entries;financeLoadedRangeV722={from,to};financeCanWriteV722=result.canWrite===true;financeProfitPolicyV726=normalizeMinimumProfitPolicy(result.profitPolicy||{});financeMinimumFillV726();finElV722('finPreviewV722').hidden=result.preview!==true;financeRenderV722();finStatusV722((result.canWrite?'':'Acesso somente para consulta. ')+stockChartLabelV720(from)+' a '+stockChartLabelV720(to)+' · '+result.entries.length+' registro(s).');}
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
 const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1),day=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');finElV722('finFromV722').value=day(start);finElV722('finToV722').value=day(now);financeNewV722();finWriteStateV722();financeMinimumFillV726();
 finElV722('finMinimumPercentV726').oninput=()=>{financeMinimumExampleV726();finElV722('finMinimumStatusV726').textContent='Percentual ainda não salvo. Toque em Salvar mínimo da empresa para aplicar.';};finElV722('finMinimumSaveV726').onclick=financeMinimumSaveV726;
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
 if(source.pendingServiceLines)warnings.push('Beneficiamento informado sem separação confirmada no total original. A margem da madeira fica pendente; o valor da venda foi preservado.');
 else if(source.serviceCents>0)warnings.push('Madeira após desconto: '+finMoneyV722(source.woodCents)+'. Serviços após desconto: '+finMoneyV722(source.serviceCents)+'. O serviço não compensa uma margem baixa da madeira.');
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

function financeOutcomeMessageV725(total){
 if(total.pendingSales)return total.pendingSales+' carga(s) aguardando conferência de possível venda manual duplicada. Margem, lucro e prejuízo ficam pendentes até resolver.';
 if(total.pendingCosts)return total.pendingCosts+' venda(s) sem custo informado. Complete o custo para calcular margem, lucro ou prejuízo.';
 if(!total.count)return 'Ainda não há lançamentos ou cargas baixadas neste período.';
 if(total.deficit>0){
  if(total.grossMargin<0)return 'O valor das vendas ficou abaixo do custo da madeira. Com os demais gastos, o prejuízo do período é de '+finMoneyV722(total.deficit)+'. Confira os preços e os custos.';
  return (total.loss>0?'As despesas e perdas de madeira ultrapassaram':'As despesas ultrapassaram')+' a margem em '+finMoneyV722(total.deficit)+'. Esse é o prejuízo do período. Confira os preços e os gastos.';
 }
 if(total.grossMargin>0&&total.result===0)return 'A margem foi totalmente consumida pelos gastos. O período ficou sem lucro e sem prejuízo.';
 return 'Depois dos custos e gastos, o lucro do período é de '+finMoneyV722(total.profit)+'. Os valores refletem os registros consultados, não o saldo bancário.';
}

function financeMinimumFillV726(){
 const field=finElV722('finMinimumPercentV726');if(!field)return;
 if(!financeLoadedRangeV722){finElV722('finMinimumStatusV726').textContent='Consulte o período para carregar o mínimo salvo.';financeMinimumExampleV726();return;}
 field.value=financeProfitPolicyV726.minimumBasisPoints===null?'':(financeProfitPolicyV726.minimumBasisPoints/100).toLocaleString('pt-BR',{maximumFractionDigits:2});
 finElV722('finMinimumStatusV726').textContent=financeProfitPolicyV726.minimumBasisPoints===null?'Aviso não configurado. Informe o percentual e salve para ativar.':'Mínimo salvo: '+financeMinimumPercentV726()+' sobre o custo da madeira. Meta geral da empresa, aplicada às vendas consultadas.';
 financeMinimumExampleV726();
}
function financeMinimumPercentV726(){return (financeProfitPolicyV726.minimumBasisPoints/100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';}
function financeMinimumExampleV726(){
 const field=finElV722('finMinimumPercentV726'),note=finElV722('finMinimumExampleV726');if(!field||!note)return;
 try{const points=minimumProfitPercentInput(field.value);note.textContent=points===null?'Deixe vazio e salve para desligar os avisos de mínimo.':'Com madeira que custou R$ 100,00, o preço mínimo de venda é '+finMoneyV722(10000+expectedMinimumProfit(10000,points))+'.';}catch(e){note.textContent=e.message;}
}
async function financeMinimumSaveV726(){
 if(!finOwnerV722()||financeBusyV722||!financeCanWriteV722)return;const status=finElV722('finMinimumStatusV726');let points;
 try{points=minimumProfitPercentInput(finElV722('finMinimumPercentV726').value);}catch(e){status.textContent=e.message;return;}
 financeBusyV722=true;finWriteStateV722();status.textContent='Salvando mínimo da empresa…';
 try{const result=await financeRequestV722({minimumBasisPoints:points,revision:financeProfitPolicyV726.revision},null,'company-profit-policy');financeProfitPolicyV726=normalizeMinimumProfitPolicy(result.policy);financeMinimumFillV726();financeRenderV722();}
 catch(e){status.textContent=e.message+' O percentual preenchido foi preservado.';}
 finally{financeBusyV722=false;finWriteStateV722();}
}
function financeMinimumSummaryV726(summary){
 const node=finElV722('finMinimumSummaryV726');if(!node)return;node.hidden=!summary.enabled;node.className='note';if(!summary.enabled)return;
 const notes=['Mínimo da empresa: '+financeMinimumPercentV726()+' sobre o custo da madeira.'];
 if(summary.belowCount)notes.push(summary.belowCount+' venda(s) com preço abaixo do mínimo.');
 if(summary.periodBelow)notes.push('O resultado após as despesas, sem usar o adicional de serviços para cobrir a meta da madeira, ficou '+finMoneyV722(summary.shortfallCents)+' abaixo do lucro mínimo esperado para o período.');
 if(summary.pendingCount)notes.push(summary.pendingCount+' venda(s) aguardando custo, separação dos serviços ou conferência para avaliar o mínimo.');
 if(!summary.saleCount)notes.push('Sem vendas ativas para avaliar neste período.');
 else if(!summary.pendingCount&&!summary.belowCount&&!summary.periodBelow)notes.push('Mínimo atendido nas vendas e no resultado do período.');
 if(summary.belowCount||summary.periodBelow)node.className+=' fin-minimum-warning';node.textContent=notes.join(' ');
}
function financeSaleMinimumV726(row){
 const check=evaluateMinimumProfit(row,financeProfitPolicyV726);if(check.status==='disabled'||check.status==='ignored')return '';
 if(check.status==='pending-service')return '<p class="note">Lucro mínimo da madeira: pendente de separar o serviço no valor original da carga.</p>';
 if(check.status==='pending-cost'||check.status==='pending-review')return '<p class="note">Lucro mínimo: avaliação pendente de custo ou conferência.</p>';
 return check.status==='below'?'<p class="fin-minimum-warning"><strong>Abaixo do mínimo da empresa</strong><br>Margem da madeira antes das despesas, sem adicional de serviços: '+finMoneyV722(check.grossCents)+'. Mínimo esperado: '+finMoneyV722(check.requiredCents)+'. Valor mínimo da madeira, sem serviços, para este custo: '+finMoneyV722(check.minimumSaleCents)+'.</p>':'<p class="note fin-minimum-met">Mínimo atendido no preço da madeira, sem adicional de serviços ('+financeMinimumPercentV726()+' sobre o custo, antes das despesas).</p>';
}
