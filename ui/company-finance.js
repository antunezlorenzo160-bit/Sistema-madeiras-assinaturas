let financeOpeningPolicyV732={unitCents:null,cutoffAt:null,revision:0};
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
function finWriteStateV722(){for(const field of finElV722('finFormV722').querySelectorAll('input,select,button'))field.disabled=financeBusyV722||!financeCanWriteV722;finElV722('finLoadV722').disabled=financeBusyV722;finElV722('finGroupV722').disabled=financeBusyV722;for(const id of ['finMinimumPercentV726','finMinimumSaveV726','finOpeningUnitV732','finOpeningSaveV732']){const field=finElV722(id);if(field)field.disabled=financeBusyV722||!financeCanWriteV722;}}
async function financeRequestV722(input,range,endpoint='company-finance'){
 if(!finOwnerV722())throw Error('O financeiro é exclusivo do responsável pela empresa.');
 if(!navigator.onLine)throw Error('Conecte-se à internet. O formulário foi preservado.');
 const user=authV456.currentUser;if(!user)throw Error('Entre novamente com sua conta.');
 const response=await fetch('/.netlify/functions/'+endpoint+(range?'?'+new URLSearchParams(range):''),{method:input?'POST':'GET',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),signal:AbortSignal.timeout(20000),cache:'no-store'});
 const data=await response.json();if(!response.ok){const error=Error(data.error||'Não foi possível acessar o financeiro.');error.status=response.status;throw error;}
 if(authV456.currentUser?.uid!==user.uid||data.empresaId!==empresaV456||!finOwnerV722())throw Error('A sessão mudou. Entre novamente.');return data;
}
function financeRenderV722(){
 if(!finOwnerV722()||!financeLoadedRangeV722)return;
 financeRowsV722=reviewLoadSaleDuplicates(financeRowsV722);
 const range={...financeLoadedRangeV722,group:finElV722('finGroupV722').value};let report;
 let reconciliation;try{report=aggregateFinance(financeRowsV722,range);reconciliation=reconcileFinanceSales(financeRowsV722,range);}catch(e){finElV722('finNumbersV722').hidden=true;finStatusV722(e.message);return;}
 const t=report.total;finElV722('finNumbersV722').hidden=false;finElV722('finShownPeriodV722').textContent='Valores exibidos: '+stockChartLabelV720(range.from)+' a '+stockChartLabelV720(range.to)+'.';
 const minimum=assessMinimumProfitPeriod(financeRowsV722.filter(row=>row.date>=range.from&&row.date<=range.to),t,financeProfitPolicyV726);
 financeMinimumSummaryV726(minimum);
 const serviceRows=financeRowsV722.filter(row=>row.type==='sale'&&row.status==='active'&&row.source?.type==='load-sale'&&row.date>=range.from&&row.date<=range.to),servicePending=serviceRows.some(row=>row.source.pendingServiceLines>0||row.source.serviceCents===null),serviceTotal=serviceRows.reduce((sum,row)=>sum+(row.source.serviceCents||0),0);
 const review=reconciliation.manualDifferenceCount>0;
 const stats=[['Vendas do período',t.sale],[t.pendingCosts?'Custo total da madeira vendida (parcial)':'Custo total da madeira vendida',t.cost],['Despesas do período',t.expense],['Resultado calculado',t.result,review?'fin-review-v735':t.result<0?'fin-negative':t.result>0?'fin-positive':'']];
 const other=[['Compras registradas no período',t.purchase],['Margem antes das despesas',t.grossMargin],...(minimum.enabled?[['Lucro mínimo esperado',minimum.requiredCents]]:[]),...(serviceTotal||servicePending?[[servicePending?'Serviços nas cargas (separação pendente)':'Serviços incluídos nas vendas',servicePending?null:serviceTotal]]:[]),...(t.loss>0?[['Perdas de madeira / material',t.loss]]:[])];
 const renderStats=values=>values.map(([label,value,color])=>'<div><small>'+label+'</small><strong class="'+(color||(value!==null&&value<0?'fin-negative':''))+'">'+(value===null?'Pendente':finMoneyV722(value))+'</strong></div>').join('');
 finElV722('finStatsV722').innerHTML=renderStats(stats);finElV722('finOtherStatsV735').innerHTML=renderStats(other);
 finElV722('finPendingV722').textContent=(review?reconciliation.manualDifferenceCount+' custo(s) manual(is) diferente(s) do estoque. Confira as contas abaixo antes de usar o resultado. ':'')+financeOutcomeMessageV725(t);
 financeSaleChecksV735(reconciliation);
 const graphSeries=[['sale','Vendas'],['purchase','Compras'],['expense','Despesas'],...(t.loss>0?[['loss','Perdas de madeira / material']]:[]),['profit','Lucro'],['deficit','Prejuízo']];
 const used=report.rows.filter(r=>r.count||r.pendingSales),maximum=Math.max(1,...used.flatMap(r=>graphSeries.map(([key])=>r[key]||0)));
 finElV722('finChartV722').innerHTML=used.length?'<h4>Valores por período</h4>'+used.map(row=>'<article class="fin-period-chart"><h4>'+stockChartLabelV720(row.key)+'</h4>'+graphSeries.map(([key,label])=>'<div class="fin-chart-label"><span>'+label+'</span><strong>'+(row[key]===null?'Pendente':finMoneyV722(row[key]))+'</strong></div><div class="fin-track"><span class="fin-bar-'+key+'" style="width:'+((row[key]||0)/maximum*100)+'%"></span></div>').join('')+'<p class="note">Margem antes das despesas: '+(row.grossMargin===null?'pendente':finMoneyV722(row.grossMargin))+'</p></article>').join(''):'<p class="empty">Os gráficos aparecem quando houver lançamentos no período.</p>';
 const columns=[['purchase','Compras'],['sale','Vendas'],['cost','Custo das vendas'],['grossMargin','Margem antes das despesas'],['expense','Despesas'],...(t.loss>0?[['loss','Perdas de madeira / material']]:[]),['profit','Lucro'],['deficit','Prejuízo']];
 finElV722('finPeriodTableV722').innerHTML='<table><thead><tr><th>Período</th>'+columns.map(([,label])=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+report.rows.map(row=>'<tr><td>'+stockChartLabelV720(row.key)+'</td>'+columns.map(([key])=>'<td>'+(row[key]===null?'Pendente':finMoneyV722(row[key]))+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 finElV722('finEntriesV722').innerHTML=financeRowsV722.length?financeRowsV722.map(row=>'<article class="fin-entry'+(row.status==='cancelled'?' fin-cancelled':'')+'"><div><strong>'+esc(FINANCE_TYPES[row.type]||row.type)+' · '+stockChartLabelV720(row.date)+' · '+finMoneyV722(row.amountCents)+'</strong><p>'+esc(row.description)+'</p><small>'+esc([row.partner,FINANCE_CATEGORIES[row.category],row.reference].filter(Boolean).join(' · '))+'</small>'+(row.type==='sale'?'<p class="note">Custo total da madeira desta venda: '+(row.costCents===null?'pendente':finMoneyV722(row.costCents))+'</p>':'')+'</div>'+financeSaleMinimumV726(row)+(row.source?.type==='load-sale'?financeLoadSaleActionsV724(row):row.status==='cancelled'?'<strong>Cancelado</strong>':row.source?.type==='log-purchase'?'<p class="note">Compra vinculada às toras. Confira ou cancele na aba Toras.</p><button type="button" class="btn btn-secondary" data-open-log-purchase>Abrir compras de toras</button>':row.source?.type==='stock-purchase'?'<p class="note">Compra vinculada ao descarregamento no estoque. Frete e gastos acrescentados compõem o custo da madeira; não os registre novamente como despesa.</p>':row.source?.type==='shared-trip'?'<p class="note">Despesa única da viagem compartilhada, rateada por volume físico. Altere em Carregamentos.</p><button type="button" class="btn btn-secondary" data-open-trip-id="'+esc(row.source.tripId)+'">Ver viagem em Carregamentos</button>':row.source?.type==='load-transport'?'<p class="note">Vinculado ao carregamento. Altere em Gastos do transporte.</p>':financeCanWriteV722?'<div class="fin-actions"><button type="button" class="btn btn-secondary" data-fin-edit="'+esc(row.id)+'">Editar</button><button type="button" class="btn btn-danger" data-fin-cancel="'+esc(row.id)+'">Cancelar registro</button></div>':'')+'</article>').join(''):'<p class="empty">Nenhum lançamento neste período.</p>';
}
async function financeLoadV722(){
 if(!finOwnerV722()||financeBusyV722)return;
 const from=finElV722('finFromV722').value,to=finElV722('finToV722').value;
 if(stockChartDate(from)!==from||stockChartDate(to)!==to||from>to){finStatusV722('Confira as datas da consulta.');return;}
 const sequence=++financeSequenceV722;financeBusyV722=true;finWriteStateV722();finStatusV722('Consultando lançamentos…');
 try{const result=await financeRequestV722(null,{from,to});if(sequence!==financeSequenceV722)return;financeRowsV722=result.entries;financeLoadedRangeV722={from,to};financeCanWriteV722=result.canWrite===true;financeProfitPolicyV726=normalizeMinimumProfitPolicy(result.profitPolicy||{});financeMinimumFillV726();financeOpeningPolicyV732=normalizeOpeningStockCost(result.openingPolicy||{});financeOpeningFillV732();finElV722('finPreviewV722').hidden=result.preview!==true;financeRenderV722();finStatusV722((result.canWrite?'':'Acesso somente para consulta. ')+stockChartLabelV720(from)+' a '+stockChartLabelV720(to)+' · '+result.entries.length+' registro(s).');if(typeof purchaseAccountsLoadV757==='function')await purchaseAccountsLoadV757();}
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
 finElV722('finMinimumPercentV726').oninput=()=>{financeMinimumExampleV726();finElV722('finMinimumStatusV726').textContent='Percentual ainda não salvo. Toque em Salvar mínimo da empresa para aplicar.';};finElV722('finMinimumSaveV726').onclick=financeMinimumSaveV726;finElV722('finOpeningSaveV732').onclick=financeOpeningSaveV732;
 finElV722('finLoadV722').onclick=financeLoadV722;finElV722('finGroupV722').onchange=financeRenderV722;
 for(const id of ['finFromV722','finToV722'])finElV722(id).onchange=()=>finStatusV722('Toque em Consultar período para atualizar os valores.');
 finElV722('finTypeV722').onchange=()=>{finElV722('finCostLabelV722').hidden=finElV722('finTypeV722').value!=='sale';};finElV722('finFormV722').onsubmit=financeSaveV722;
 finElV722('finNewV722').onclick=()=>{financeNewV722();finElV722('finWriteStatusV722').textContent='Novo lançamento.';};
 panel.addEventListener('input',event=>{const root=event.target.closest('[data-load-sale]');if(root&&event.target.matches('[data-load-sale-cost]'))financeLoadCostPreviewV736(root);});
 panel.addEventListener('change',event=>{const mode=event.target.closest('[data-load-sale-cost-mode]');if(mode){const root=mode.closest('[data-load-sale]');root.querySelector('[data-load-sale-cost]').value='';financeLoadCostPreviewV736(root);}});
 panel.addEventListener('change',event=>{const auto=event.target.closest('[data-load-sale-auto]');if(!auto)return;const cost=auto.closest('[data-load-sale]').querySelector('[data-load-sale-cost]');cost.disabled=auto.checked||!financeCanWriteV722;if(auto.checked){const row=financeRowsV722.find(entry=>entry.id===auto.closest('[data-load-sale]').dataset.loadSale);if(Number.isSafeInteger(row?.source?.automaticCostCents))cost.value=(row.source.automaticCostCents/100).toFixed(2).replace('.',',');}const root=auto.closest('[data-load-sale]'),mode=root.querySelector('[data-load-sale-cost-mode]');if(mode){mode.value='total';mode.disabled=auto.checked||!financeCanWriteV722;}financeLoadCostPreviewV736(root);});
 panel.addEventListener('change',event=>{const select=event.target.closest('[data-load-sale-manual]');if(!select)return;const root=select.closest('[data-load-sale]'),manual=financeRowsV722.find(entry=>entry.id===select.value),cost=root.querySelector('[data-load-sale-cost]');if(manual?.costCents!==null&&manual?.costCents!==undefined&&!cost.value.trim())cost.value=(manual.costCents/100).toFixed(2).replace('.',',');});
 panel.addEventListener('click',event=>{const sourceButton=event.target.closest('[data-fin-show-source]');if(!sourceButton)return;const row=document.querySelector('[data-load-sale=\"'+sourceButton.dataset.finShowSource+'\"]');if(row){finElV722('finLedgerV735').open=true;row.open=true;row.scrollIntoView({block:'center',behavior:'smooth'});}});
 panel.addEventListener('click',event=>{if(event.target.closest('[data-open-log-purchase]')){openLogPurchaseV756();return;}const save=event.target.closest('[data-load-sale-save]');if(save){financeSaveLoadSaleV724(save.closest('[data-load-sale]'));return;}const edit=event.target.closest('[data-fin-edit]'),cancel=event.target.closest('[data-fin-cancel]');if(cancel){financeCancelV722(cancel.dataset.finCancel);return;}if(!edit||financeBusyV722||!financeCanWriteV722)return;
  const row=financeRowsV722.find(r=>r.id===edit.dataset.finEdit);if(!row||row.source)return;financeEditV722={...row};for(const [id,key] of [['finTypeV722','type'],['finDateV722','date'],['finDescriptionV722','description'],['finPartnerV722','partner'],['finReferenceV722','reference'],['finCategoryV722','category']])finElV722(id).value=row[key]||'';
  finElV722('finAmountV722').value=(row.amountCents/100).toFixed(2).replace('.',',');finElV722('finCostV722').value=row.costCents===null?'':(row.costCents/100).toFixed(2).replace('.',',');finElV722('finCostLabelV722').hidden=row.type!=='sale';finElV722('finSaveV722').textContent='Salvar alterações';finElV722('finEntryBoxV722').open=true;finElV722('finEntryBoxV722').scrollIntoView({block:'start',behavior:'smooth'});
 });
}
setTimeout(mountFinanceV722,0);
function financeLoadSaleActionsV724(row){
 const source=row.source,warnings=[];
 if(row.status==='pending-review')warnings.push('Existe venda manual com a mesma data e valor. Escolha abaixo se é a mesma venda ou outra venda. Esta carga ainda não foi somada para evitar duplicidade.');
 if(source.costRequiresReview)warnings.push('As peças ou quantidades mudaram. Confira o custo atualizado antes de salvar.');
 if(source.usesSpeciesReference)warnings.push('O ajuste sem custo na própria bitola usou como referência a média conhecida de outras medidas da mesma espécie e condição, seca ou verde. Não gerou outra compra.');
 else if(source.usesConferenceAverage)warnings.push('O ajuste de quantidade foi avaliado pelo custo médio já conhecido desta madeira e medida, sem gerar outra compra.');
 if(source.costMode==='average')warnings.push('Custo médio automático da madeira baixada: '+finMoneyV722(row.costCents)+'. Inclui os gastos de aquisição rateados na compra.');
 if(source.automaticCostCents===null)warnings.push('Automático — aguardando custo da compra. '+(source.automaticCostPendingReason||source.costPendingReason||'Consulte novamente após sincronizar a compra e a baixa do estoque.')+' Não é preciso digitar o preço de venda como custo.');
 if(source.pendingServiceLines)warnings.push('Beneficiamento informado sem separação confirmada no total original. A margem da madeira fica pendente; o valor da venda foi preservado.');
 else if(source.serviceCents>0)warnings.push('Madeira após desconto: '+finMoneyV722(source.woodCents)+'. Serviços após desconto: '+finMoneyV722(source.serviceCents)+'. O serviço não compensa uma margem baixa da madeira.');
 if(source.zeroValueLines)warnings.push(source.zeroValueLines+' item(ns) sem valor de venda. Confira os preços no carregamento.');
 if(source.manualEntryId)warnings.push('Esta carga substitui um lançamento manual anterior, preservado como cancelado.');
 const automatic=Number.isSafeInteger(source.automaticCostCents)&&source.automaticCostCents>=0,useAutomatic=source.costMode==='average'||source.costMode==='pending'||(row.costCents===null&&source.costMode!=='manual');
 const manual=(source.possibleManualIds||[]).map(id=>financeRowsV722.find(entry=>entry.id===id)).filter(Boolean),disabled=financeCanWriteV722?'':' disabled';
 return '<details class="fin-load-sale-v724" data-load-sale="'+esc(row.id)+'"><summary>'+(row.status==='cancelled'?'Carga fora das vendas':'Venda vinculada à carga — conferir custo')+'</summary><p class="note">Total do documento original: '+finMoneyV722(row.amountCents)+' (produtos − desconto + frete e outros valores cobrados). O valor se atualiza pelo carregamento; a cópia comercial não é outra venda.</p>'+warnings.map(text=>'<p class="note">'+esc(text)+'</p>').join('')+'<label><input type="checkbox" data-load-sale-include'+(row.status!=='cancelled'?' checked':'')+disabled+'> Considerar esta carga como venda</label>'+'<label><input type="checkbox" data-load-sale-auto'+(useAutomatic?' checked':'')+disabled+'> Usar custo médio automático da compra / estoque</label><p class="note">O sistema calcula o custo pela quantidade retirada. Desmarque apenas para corrigir manualmente esta venda.</p>'+financeLoadCostModeV736(row,useAutomatic,disabled)+'<label><span data-load-sale-cost-label>Custo TOTAL da madeira desta venda (R$)</span><input type="text" inputmode="decimal" data-load-sale-cost value="'+(row.costCents===null?'':(row.costCents/100).toFixed(2).replace('.',','))+'" placeholder="Vazio = resultado pendente"'+(useAutomatic?' disabled':disabled)+'></label><p class="note">O custo vem automaticamente do estoque quando disponível. Para corrigir manualmente, escolha custo total ou preço por m³. Exemplo: 10 m³ a R$ 1.300/m³ custam R$ 13.000 no total. Gastos de entrega já registrados ficam separados.</p><p class="note" data-load-sale-cost-preview role="status"></p>'+(manual.length?'<label>Conferir venda manual<select data-load-sale-manual'+disabled+'><option value="__choose__">Escolha para evitar duplicidade</option><option value="__separate__">É outra venda; considerar as duas</option>'+(!source.manualEntryId?manual.map(entry=>'<option value="'+esc(entry.id)+'">Substituir: '+esc(entry.description)+' — '+finMoneyV722(entry.amountCents)+'</option>').join(''):'')+'</select></label><p class="note">Ao substituir, o lançamento manual é cancelado e preservado no histórico. A venda da carga passa a contar uma única vez.</p>':'')+'<button type="button" class="btn btn-primary" data-load-sale-save'+disabled+'>Salvar custo / conferência</button><p class="note" data-load-sale-status role="status"></p></details>';
}
async function financeSaveLoadSaleV724(root){
 if(financeBusyV722||!finOwnerV722()||!financeCanWriteV722)return;
 const row=financeRowsV722.find(entry=>entry.id===root.dataset.loadSale);if(!row||row.source?.type!=='load-sale')return;
 const status=root.querySelector('[data-load-sale-status]'),select=root.querySelector('[data-load-sale-manual]'),choice=select?.value;
 if(choice==='__choose__'){status.textContent='Escolha se o lançamento manual representa esta mesma venda ou outra venda.';return;}
 const manual=choice&&choice!=='__separate__'?financeRowsV722.find(entry=>entry.id===choice):null;
 let cost;try{const raw=root.querySelector('[data-load-sale-cost]').value.trim(),automatic=root.querySelector('[data-load-sale-auto]');if(automatic&&!automatic.checked&&raw==='')throw Error('Informe o custo manual ou marque Usar custo médio automático.');cost=automatic?.checked?null:raw===''?null:loadSaleManualCost(financeCents(raw),root.querySelector('[data-load-sale-cost-mode]')?.value||'total',row.source.physicalM3);}catch(e){status.textContent=e.message;return;}
 const include=root.querySelector('[data-load-sale-include]').checked;
 if(manual&&!include){status.textContent='Marque a carga como venda para substituir o lançamento manual.';return;}
 financeBusyV722=true;finWriteStateV722();for(const field of root.querySelectorAll('input,select,button'))field.disabled=true;status.textContent='Salvando custo e conferência…';
 try{
  const result=await financeRequestV722({loadId:row.source.loadId,revision:row.revision,signature:row.source.signature,include,costCents:cost,manualEntry:manual?{id:manual.id,revision:manual.revision}:null,resolution:manual?'replace':choice==='__separate__'?'separate':row.source.separateConfirmed?'separate':'none'},null,'company-load-sale');
  financeRowsV722=financeRowsV722.map(entry=>entry.id===result.entry.id?result.entry:result.manualEntry&&entry.id===result.manualEntry.id?result.manualEntry:entry);financeRenderV722();finStatusV722('Custo e conferência da venda salvos. O valor da venda continua vinculado ao carregamento original.');
 }catch(e){status.textContent=e.message+' Os campos foram preservados.';}
 finally{financeBusyV722=false;finWriteStateV722();for(const field of root.querySelectorAll('input,select,button'))field.disabled=!financeCanWriteV722;const auto=root.querySelector('[data-load-sale-auto]');if(auto?.checked){for(const selector of ['[data-load-sale-cost]','[data-load-sale-cost-mode]']){const field=root.querySelector(selector);if(field)field.disabled=true;}}}
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
 return 'Resultado calculado com os custos e gastos registrados: '+finMoneyV722(total.profit)+'. Os valores refletem os registros consultados, não o saldo bancário.';
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

function financeOpeningFillV732(){
 const field=finElV722('finOpeningUnitV732'),note=finElV722('finOpeningStatusV732');if(!field||!note)return;
 field.value=financeOpeningPolicyV732.unitCents===null?(financeOpeningPolicyV732.revision?'':'1000,00'):(financeOpeningPolicyV732.unitCents/100).toFixed(2).replace('.',',');
 note.textContent=financeOpeningPolicyV732.unitCents===null?(financeOpeningPolicyV732.revision?'Custo antigo desativado.':'R$ 1.000,00/m³ preenchido, ainda não aplicado. Toque em Salvar para registrar na empresa.'):'Custo antigo salvo: '+finMoneyV722(financeOpeningPolicyV732.unitCents)+'/m³. Compras com preço próprio são preservadas.';
}
async function financeOpeningSaveV732(){
 if(financeBusyV722||!financeCanWriteV722||!finOwnerV722())return;
 const field=finElV722('finOpeningUnitV732'),note=finElV722('finOpeningStatusV732');let unitCents;
 try{unitCents=field.value.trim()===''?null:financeCents(field.value);normalizeOpeningStockCost({unitCents});}catch(e){note.textContent=e.message;return;}
 financeBusyV722=true;finWriteStateV722();note.textContent='Salvando custo do estoque antigo…';let saved=false;
 try{const result=await financeRequestV722({companyId:empresaV456,unitCents,revision:financeOpeningPolicyV732.revision},null,'company-opening-stock-cost');financeOpeningPolicyV732=normalizeOpeningStockCost(result.policy);financeOpeningFillV732();saved=true;}
 catch(e){note.textContent=e.message+' O valor preenchido foi preservado.';}
 finally{financeBusyV722=false;finWriteStateV722();}
 if(saved)await financeLoadV722();
}

function financeSaleChecksV735(reconciliation){
 const volume=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:4}),money=n=>n===null?'Pendente':finMoneyV722(n);
 const line=(label,value)=>'<div class="fin-sale-line-v735"><span>'+label+'</span><strong>'+value+'</strong></div>';
 const content=reconciliation.rows.map(row=>{
  const origin=row.manual?'Total informado manualmente nesta venda':row.usesSpeciesReference?'Calculado com referência de custo de outras medidas da mesma espécie e condição':row.usesConferenceAverage?'Calculado pela média do estoque, com ajuste de quantidade avaliado pelo mesmo custo':'Calculado pela média do estoque',unit=row.unitEquivalentCents===null?'':(row.manual?'Equivale a aproximadamente ':'Média aproximada de ')+money(row.unitEquivalentCents)+'/m³.';
  return '<article class="fin-sale-check-v735"><h4>'+esc(row.partner||row.description||'Venda')+'</h4><p class="note">'+stockChartLabelV720(row.date)+(row.loadId?' · Carregamento':' · Venda avulsa')+(row.physicalM3!==null?' · '+volume(row.physicalM3)+' m³':'')+'</p>'+line('Valor vendido',money(row.amountCents))+(row.billedFreightCents>0||row.billedOtherCents>0?'<p class="note">Já inclui '+(row.billedFreightCents>0?money(row.billedFreightCents)+' de frete cobrado do cliente':'')+(row.billedFreightCents>0&&row.billedOtherCents>0?' e ':'')+(row.billedOtherCents>0?money(row.billedOtherCents)+' de outros valores cobrados':'')+'. O gasto real da entrega aparece separado abaixo.</p>':'')+line('− Custo TOTAL da madeira',money(row.costCents))+'<p class="note">'+(row.costCents===null?esc(row.pendingReason||'Custo ainda não calculado.'):esc(origin+'. '+unit))+'</p>'+(row.manual&&row.automaticCostCents===null&&row.automaticPendingReason?'<p class="note">O custo automático ainda não está disponível: '+esc(row.automaticPendingReason)+' O total manual foi mantido.</p>':'')+(row.manualDiffers?'<p class="fin-minimum-warning">Custo calculado pelo estoque: <strong>'+money(row.automaticCostCents)+'</strong>'+(row.automaticUnitCents!==null?' (aproximadamente '+money(row.automaticUnitCents)+'/m³)':'')+'. O valor manual está sendo usado. Confira se foi informado o total da carga.</p>':'')+line('− Gastos de entrega no período',money(row.transportCents))+(row.sharedTripCount?'<p class="note">Inclui a parte desta carga nos gastos da viagem compartilhada, rateada pelo volume físico.</p>':'')+line('= Resultado desta venda no período',money(row.netCents))+(row.transportCount===0?'<p class="note">Nenhum gasto de entrega vinculado a esta venda neste período.</p>':'')+(row.loadId?'<button type="button" class="btn btn-secondary" data-fin-show-source="'+esc(row.id)+'">Conferir custo desta carga</button>':financeCanWriteV722?'<button type="button" class="btn btn-secondary" data-fin-edit="'+esc(row.id)+'">Conferir custo desta venda</button>':'')+'</article>';
 }).join('');
 finElV722('finSaleChecksV735').innerHTML='<h3>Conta de cada venda</h3><p class="note">Somente registros ativos das datas consultadas. Gastos gerais não são divididos entre cargas por suposição.</p>'+(content||'<p class="note">Nenhuma venda ativa neste período.</p>')+reconciliation.pendingReviews.map(row=>'<article class="fin-sale-check-v735"><h4>'+esc(row.partner||'Venda em conferência')+'</h4><p class="fin-minimum-warning">Venda de '+money(row.amountCents)+' aguardando conferir possível duplicidade. Ainda não foi somada.</p><button type="button" class="btn btn-secondary" data-fin-show-source="'+esc(row.id)+'">Conferir esta venda</button></article>').join('')+'<div class="fin-sale-closing-v735">'+line(reconciliation.pendingCosts?'Custos já calculados — ainda há vendas pendentes':'Custo total da madeira: soma das vendas acima',money(reconciliation.costTotalCents))+line('Outras despesas do período',money(reconciliation.otherExpenseCents))+(reconciliation.lossCents?line('Perdas de madeira / material',money(reconciliation.lossCents)):'')+line('Resultado do período, após os demais gastos',money(reconciliation.resultCents))+'</div>';
}

function financeLoadCostModeV736(row,useAutomatic,disabled){
 const hasVolume=Number.isFinite(row.source.physicalM3)&&row.source.physicalM3>0;
 return '<label>Como informar a correção do custo<select data-load-sale-cost-mode'+(useAutomatic?' disabled':disabled)+'><option value="total">Custo total da carga (R$)</option>'+(hasVolume?'<option value="m3">Preço de custo por m³ (R$/m³)</option>':'')+'</select></label>';
}
function financeLoadCostPreviewV736(root){
 const row=financeRowsV722.find(entry=>entry.id===root.dataset.loadSale),note=root.querySelector('[data-load-sale-cost-preview]'),label=root.querySelector('[data-load-sale-cost-label]'),mode=root.querySelector('[data-load-sale-cost-mode]')?.value||'total',automatic=root.querySelector('[data-load-sale-auto]')?.checked;
 if(!row||!note)return;
 if(label)label.textContent=mode==='m3'?'Preço de custo por m³ (R$/m³)':'Custo TOTAL da madeira desta venda (R$)';
 if(automatic){note.textContent=Number.isSafeInteger(row.source.automaticCostCents)?'Custo total calculado pelo estoque: '+finMoneyV722(row.source.automaticCostCents)+'.':'Automático — aguardando custo da compra. '+(row.source.automaticCostPendingReason||row.source.costPendingReason||'Consulte novamente após sincronizar a compra e a baixa do estoque.');return;}
 const raw=root.querySelector('[data-load-sale-cost]').value.trim();
 if(!raw){note.textContent=mode==='m3'?'Informe o preço por m³. O total será calculado pelo volume físico desta carga.':'Informe o custo total de toda a madeira desta carga.';return;}
 try{const value=financeCents(raw),total=loadSaleManualCost(value,mode,row.source.physicalM3);note.textContent=mode==='m3'?Number(row.source.physicalM3).toLocaleString('pt-BR',{maximumFractionDigits:9})+' m³ × '+finMoneyV722(value)+'/m³ = '+finMoneyV722(total)+' de custo total.':'Custo total a salvar: '+finMoneyV722(total)+'.';}catch(e){note.textContent=e.message;}
}
