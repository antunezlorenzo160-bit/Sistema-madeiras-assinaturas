// V804: explicit service confirmation; cubage and stock remain unchanged.
let logLabourStateV804=null;
const logLabourOwnerV804=()=>parent.__smEmployeeMember?.()?.papel==='admin';
function mountLogLabourV804({dialog,doc,getRows}){
 if(logLabourStateV804&&(!logLabourOwnerV804()||logLabourStateV804.company!==empresaV456)){logLabourStateV804.root.remove();logLabourStateV804=null;}
 if(!logLabourOwnerV804())return;
 if(logLabourStateV804?.company===empresaV456&&logLabourStateV804.root.isConnected)return;
 logLabourStateV804?.root.remove();
 const root=doc.createElement('details');root.id='logLabourV804';root.className='card no-print';root.innerHTML=`<summary>Mão de obra no financeiro</summary><p>Registre as toras com mão de obra da lista atual para o cliente informado. Toras já registradas não serão cobradas novamente. Use para serviços que ainda não foram lançados manualmente no financeiro ou no caixa.</p><button type="button" class="btn btn-secondary" id="llPrepareV804">Conferir lista atual</button><p id="llSummaryV804">Confira a lista para registrar o serviço.</p><form id="llFormV804"><div class="grid3"><label>Cliente<input id="llClientV804" maxlength="120" required></label><label>Data do serviço<input id="llDateV804" type="date" required></label><label>Descrição<input id="llDescriptionV804" maxlength="180" required></label></div><label>Referência (opcional)<input id="llReferenceV804" maxlength="120"></label><label>Recebimento<select id="llModeV804" required><option value="">Selecione</option><option value="cash">À vista — já recebido</option><option value="credit">A prazo — a receber</option><option value="partial">Recebimento parcial</option></select></label><label id="llDueBoxV804">Vencimento do restante<input id="llDueV804" type="date"></label><label id="llAmountBoxV804">Valor já recebido (R$)<input id="llAmountV804" inputmode="decimal"></label><label id="llPaidBoxV804">Data do recebimento<input id="llPaidV804" type="date"></label><button class="btn btn-primary" id="llConfirmV804" type="submit">Registrar serviço no financeiro</button></form><p id="llStatusV804" role="status"></p><button type="button" id="llRetryV804" class="btn btn-secondary" hidden>Conferir tentativa pendente</button><h3>Serviços e valores a receber</h3><div class="grid3"><label>De<input type="date" id="llFromV804"></label><label>Até<input type="date" id="llToV804"></label><button type="button" id="llLoadV804" class="btn btn-secondary">Consultar serviços</button></div><p id="llHistorySummaryV804"></p><div id="llHistoryV804"></div>`;
 dialog.querySelector('.toras-planilha').append(root);
 const state={root,company:empresaV456,getRows,busy:false,historyBusy:false,canWrite:true,prepared:null,pending:null,records:[],mutation:0};logLabourStateV804=state;
 state.el=id=>root.querySelector('#'+id);state.key='log_labour_v804:'+state.company;
 const today=cashDayV759();let saved;try{saved=JSON.parse(window.__v456Local.getItem(state.key)||'null');}catch{}
 state.pending=saved?.pending||null;state.prepared=saved?.prepared||null;
 const draft=saved?.draft||{Client:'',Date:today,Description:'Mão de obra de toras',Reference:'',Mode:'',Due:today,Paid:today,Amount:''};
 for(const key of ['Client','Date','Description','Reference','Mode','Due','Paid','Amount'])state.el('ll'+key+'V804').value=draft[key]||'';
 state.el('llFromV804').value=today.slice(0,8)+'01';state.el('llToV804').value=today;
 state.el('llPrepareV804').onclick=()=>logLabourPrepareV804(state);state.el('llFormV804').onsubmit=event=>{event.preventDefault();logLabourConfirmV804(state);};
 state.el('llModeV804').onchange=()=>logLabourRenderV804(state);state.el('llLoadV804').onclick=()=>logLabourHistoryV804(state);state.el('llRetryV804').onclick=()=>logLabourSendV804(state,state.pending);
 state.el('llFormV804').addEventListener('change',()=>{if(!state.busy&&!state.pending)try{logLabourSaveV804(state);}catch(error){logLabourStatusV804(state,error.message);}});
 state.el('llHistoryV804').addEventListener('click',event=>{const receive=event.target.closest('[data-ll-receive]'),cancel=event.target.closest('[data-ll-cancel]');if(receive)logLabourReceiveV804(state,receive.closest('[data-ll-id]'));if(cancel)logLabourCancelV804(state,cancel.dataset.llCancel);});
 root.addEventListener('toggle',()=>{if(!root.open)return;const rows=state.getRows();if(!state.el('llClientV804').value)state.el('llClientV804').value=rows.client||'';if(!state.el('llDescriptionV804').value)state.el('llDescriptionV804').value=rows.description||'Mão de obra de toras';});
 logLabourRenderV804(state);if(state.pending)logLabourStatusV804(state,'Há uma tentativa pendente. Confira a mesma tentativa para não duplicar o serviço ou recebimento.');
}
function logLabourCurrentV804(state){return state===logLabourStateV804&&state.company===empresaV456&&logLabourOwnerV804();}
function logLabourDraftV804(state){return Object.fromEntries(['Client','Date','Description','Reference','Mode','Due','Paid','Amount'].map(key=>[key,state.el('ll'+key+'V804').value]));}
function logLabourSaveV804(state){if(!logLabourCurrentV804(state))throw Error('A empresa mudou.');const value=JSON.stringify({draft:logLabourDraftV804(state),prepared:state.prepared,pending:state.pending});window.__v456Local.setItem(state.key,value);if(window.__v456Local.getItem(state.key)!==value)throw Error('Não foi possível preservar a tentativa neste aparelho.');}
function logLabourStatusV804(state,text){if(logLabourCurrentV804(state))state.el('llStatusV804').textContent=text;}
function logLabourRenderV804(state){
 if(!logLabourCurrentV804(state))return;const locked=state.busy||!!state.pending;
 for(const field of state.el('llFormV804').querySelectorAll('input,select,button'))field.disabled=locked;
 state.el('llPrepareV804').disabled=locked;state.el('llConfirmV804').disabled=locked||!state.prepared||!state.canWrite;
 state.el('llLoadV804').disabled=state.historyBusy||state.busy;state.el('llRetryV804').hidden=!state.pending;state.el('llRetryV804').disabled=state.busy;
 for(const button of state.el('llHistoryV804').querySelectorAll('button'))button.disabled=locked||!state.canWrite;
 const mode=state.el('llModeV804').value;state.el('llDueBoxV804').hidden=!['credit','partial'].includes(mode);state.el('llAmountBoxV804').hidden=mode!=='partial';state.el('llPaidBoxV804').hidden=!['cash','partial'].includes(mode);
 state.el('llSummaryV804').textContent=state.prepared?state.prepared.totalQuantity+' tora(s) · '+num4(state.prepared.totalVolume)+' m³ · Mão de obra: '+finMoneyV722(state.prepared.totalCents):'Confira os lançamentos da lista para registrar o serviço.';
}
async function logLabourRequestV804(state,action,service,range){
 if(!logLabourCurrentV804(state))throw Error('Reabra a empresa para continuar.');if(!navigator.onLine)throw Error('Conecte-se à internet. Os dados deste aparelho foram preservados.');
 const user=authV456.currentUser;if(!user)throw Error('Entre novamente.');const response=await fetch('/.netlify/functions/company-log-labour'+(range?'?'+new URLSearchParams(range):''),{method:range?'GET':'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),...(range?{}:{'Content-Type':'application/json'})},...(range?{}:{body:JSON.stringify({action,service})}),signal:AbortSignal.timeout(30000)}),result=await response.json();if(!response.ok){const error=Error(result.error||'Não foi possível confirmar o serviço.');error.status=response.status;throw error;}return result;
}
async function logLabourPrepareV804(state){
 if(!logLabourCurrentV804(state)||state.busy||state.pending)return;
 try{const current=state.getRows(),priced=current.lines.filter(row=>typeof row.precoMaoObra==='number'&&row.precoMaoObra>0);if(!priced.length)throw Error('Adicione toras com a opção Calcular mão de obra marcada e preço maior que zero.');const lineIds=logLabourIdsV804(priced.map(row=>row.id));
  if(offlineOps().some(op=>op.nome===COL.servicos&&lineIds.some(id=>op.id==='cubagem_toras_linha_'+id))){sincronizarOfflineOps().catch(()=>{});throw Error('A cubagem ainda tem envios pendentes. Aguarde a sincronização antes de registrar o serviço.');}
  state.busy=true;logLabourRenderV804(state);logLabourStatusV804(state,'Conferindo toras e serviços já registrados…');const result=await logLabourRequestV804(state,'prepare',{companyId:state.company,lineIds});if(!logLabourCurrentV804(state))return;
  state.prepared=result.service;state.canWrite=result.canWrite;if(!state.el('llClientV804').value)state.el('llClientV804').value=current.client||'';logLabourSaveV804(state);logLabourStatusV804(state,result.service?'Lista conferida. Informe o cliente e como será o recebimento.'+(result.claimed.length?' '+result.claimed.length+' lançamento(s) já registrado(s) ficaram de fora.':''):'Todos estes lançamentos já foram registrados no financeiro.');
 }catch(error){logLabourStatusV804(state,error.message);}finally{if(logLabourCurrentV804(state)){state.busy=false;logLabourRenderV804(state);}}
}
function logLabourConfirmV804(state){
 if(!logLabourCurrentV804(state)||state.busy||state.pending||!state.prepared||!state.canWrite)return;
 try{const d=logLabourDraftV804(state),service={companyId:state.company,id:crypto.randomUUID(),client:d.Client,date:d.Date,description:d.Description,reference:d.Reference,lines:state.prepared.lines,payment:{mode:d.Mode,dueDate:d.Due||null,paidDate:d.Paid||d.Date,paidCents:d.Mode==='partial'?purchasePaymentCentsV758(d.Amount):0}};normalizeLogLabourV804(service);return logLabourSendV804(state,{action:'confirm',service});}catch(error){logLabourStatusV804(state,error.message);}
}
async function logLabourSendV804(state,operation){
 if(!logLabourCurrentV804(state)||state.busy||!operation||state.pending&&JSON.stringify(state.pending)!==JSON.stringify(operation))return;
 const previous=state.pending;try{state.pending=operation;logLabourSaveV804(state);}catch(error){state.pending=previous;logLabourStatusV804(state,error.message);return;}
 state.busy=true;logLabourRenderV804(state);logLabourStatusV804(state,'Confirmando serviço e recebimento…');
 try{const result=await logLabourRequestV804(state,operation.action,operation.service);if(!logLabourCurrentV804(state))return;
  state.pending=null;if(operation.action==='confirm')state.prepared=null;logLabourSaveV804(state);state.mutation++;state.records=[result.receipt,...state.records.filter(row=>row.id!==result.receipt.id)];financeLoadedRangeV722=null;cashStateV759=null;logLabourHistoryRenderV804(state);
  logLabourStatusV804(state,result.receipt.status==='cancelled'?'Serviço cancelado. Os recebimentos já registrados foram preservados no caixa. Cancelar não registra devolução de dinheiro.':operation.action==='receive'?'Recebimento registrado uma única vez no caixa.':'Serviço registrado uma única vez no financeiro. Saldo a receber: '+finMoneyV722(result.receipt.totalCents-logLabourPaidV804(result.receipt))+'.');
 }catch(error){if(!logLabourCurrentV804(state))return;if(!state.pending)state.pending=operation;if([400,404,409,413].includes(error.status)){state.pending=null;try{logLabourSaveV804(state);}catch{state.pending=operation;}}logLabourStatusV804(state,error.message+(state.pending?' Use Conferir tentativa pendente. Não registre novamente.':''));}
 finally{if(logLabourCurrentV804(state)){state.busy=false;logLabourRenderV804(state);}}
}
function logLabourHistoryRenderV804(state){
 let remaining=0;state.el('llHistoryV804').innerHTML=state.records.map(row=>{const paid=logLabourPaidV804(row),balance=row.status==='active'?row.totalCents-paid:0;remaining+=balance;
  return '<details data-ll-id="'+esc(row.id)+'"><summary>'+esc(row.date.split('-').reverse().join('/'))+' · '+esc(row.client)+' · '+finMoneyV722(row.totalCents)+(row.status==='cancelled'?' · Cancelado':'')+'</summary><p>'+esc(row.description)+'</p><p>Recebido: '+finMoneyV722(paid)+' · A receber: '+finMoneyV722(balance)+(row.payment.dueDate?' · Vencimento: '+stockChartLabelV720(row.payment.dueDate):'')+'</p>'+row.payments.map(p=>'<p>'+stockChartLabelV720(p.date)+' · Recebimento '+finMoneyV722(p.amountCents)+'</p>').join('')+(balance?'<label>Recebimento (R$)<input data-ll-amount inputmode="decimal" value="'+(balance/100).toFixed(2)+'"></label><label>Data do recebimento<input data-ll-date type="date" value="'+cashDayV759()+'"></label><button type="button" class="btn btn-primary" data-ll-receive>Registrar recebimento no caixa</button>':'')+(row.status==='active'?'<button type="button" class="btn btn-secondary" data-ll-cancel="'+esc(row.id)+'">Cancelar serviço por engano</button>':'<p>Recebimentos preservados. Se houve devolução, registre a saída efetiva no caixa.</p>')+'</details>';
 }).join('')||'<p>Nenhum serviço consultado.</p>';state.el('llHistorySummaryV804').textContent='A receber dos serviços listados: '+finMoneyV722(remaining);logLabourRenderV804(state);
}
async function logLabourHistoryV804(state){
 if(!logLabourCurrentV804(state)||state.historyBusy||state.busy)return;state.historyBusy=true;const revision=state.mutation;logLabourRenderV804(state);
 try{const result=await logLabourRequestV804(state,null,null,{from:state.el('llFromV804').value,to:state.el('llToV804').value});if(!logLabourCurrentV804(state)||revision!==state.mutation)return;state.records=result.receipts;state.canWrite=result.canWrite;logLabourHistoryRenderV804(state);}catch(error){logLabourStatusV804(state,error.message);}finally{if(logLabourCurrentV804(state)){state.historyBusy=false;logLabourRenderV804(state);}}
}
function logLabourReceiveV804(state,card){if(!card||state.busy||state.pending)return;const receipt=state.records.find(r=>r.id===card.dataset.llId);if(!receipt)return;try{const amountCents=purchasePaymentCentsV758(card.querySelector('[data-ll-amount]').value),date=card.querySelector('[data-ll-date]').value;if(amountCents<=0||amountCents>receipt.totalCents-logLabourPaidV804(receipt)||!paymentDateV757(date))throw Error('Confira a data e o valor recebido.');return logLabourSendV804(state,{action:'receive',service:{companyId:state.company,id:receipt.id,revision:receipt.revision,paymentId:crypto.randomUUID(),date,amountCents}});}catch(error){logLabourStatusV804(state,error.message);}}
function logLabourCancelV804(state,id){const receipt=state.records.find(row=>row.id===id);if(!receipt||state.busy||state.pending||!confirm('Cancelar este serviço no financeiro? Os recebimentos já registrados continuarão no caixa e as toras não poderão ser cobradas novamente. Esta ação não registra devolução de dinheiro.'))return;return logLabourSendV804(state,{action:'cancel',service:{companyId:state.company,id,revision:receipt.revision}});}
function openLogLabourV804(){if(!logLabourOwnerV804())return;document.getElementById('btnCubagemToras')?.click();document.getElementById('lpCubageV756')?.click();const state=logLabourStateV804;if(!state||!logLabourCurrentV804(state))return;state.root.open=true;logLabourHistoryV804(state);}
