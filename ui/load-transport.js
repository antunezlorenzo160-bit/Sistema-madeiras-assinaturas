// LOAD_TRANSPORT_V723 — real transport costs, separate from freight charged in the document.
const loadTransportStateV723=new Map();
function transportStateV723(gid){if(!loadTransportStateV723.has(gid))loadTransportStateV723.set(gid,{loaded:false,busy:false,canWrite:false,config:null,draft:null});return loadTransportStateV723.get(gid);}
function transportTodayV723(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function transportPayloadV723(root){
 const loadId=root.dataset.transportLoad,state=transportStateV723(loadId),mode=root.querySelector('[data-transport-mode]').value,allowed=transportCostKeys(mode),costs={};
 for(const key of Object.keys(TRANSPORT_COSTS))costs[key]=allowed.includes(key)?financeCents(root.querySelector('[data-transport-cost="'+key+'"]').value.trim()||'0'):0;
 return {loadId,revision:state.draft?.revision??state.config?.revision??0,mode,date:root.querySelector('[data-transport-date]').value,costs};
}
function transportBodyV723(gid){
 const state=transportStateV723(gid);if(!state.loaded)return '<button type="button" class="btn btn-secondary" data-transport-reload>Consultar gastos do transporte</button><p class="note" data-transport-status>Abra esta seção para consultar os gastos salvos.</p>';
 const value=state.draft||state.config||{mode:'own',date:transportTodayV723(),costs:{}},raw=key=>state.draft?state.draft.costs[key]||'0,00':((value.costs[key]||0)/100).toFixed(2).replace('.',','),allowed=transportCostKeys(value.mode),disabled=state.canWrite&&!state.busy?'':' disabled';
 return '<form data-transport-form><p class="note">Informe somente os gastos reais desta viagem. Eles entram automaticamente como despesas no Financeiro. Não registre esses mesmos gastos novamente lá.</p><div class="transport-grid-v723"><label>Quem faz / paga o transporte?<select data-transport-mode'+disabled+'>'+[['own','Transporte próprio'],['contracted','Transportador contratado'],['customer','Cliente paga diretamente']].map(([key,label])=>'<option value="'+key+'"'+(value.mode===key?' selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Data da despesa<input type="date" data-transport-date value="'+esc(value.date)+'" required'+disabled+'></label>'+Object.entries(TRANSPORT_COSTS).map(([key,label])=>'<label data-transport-field="'+key+'"'+(allowed.includes(key)?'':' hidden')+'>'+label+' (R$)<input type="text" inputmode="decimal" data-transport-cost="'+key+'" value="'+esc(raw(key))+'"'+disabled+'></label>').join('')+'</div><p class="note" data-transport-total></p><div class="fin-actions"><button type="submit" class="btn btn-primary"'+disabled+'>Salvar gastos e registrar despesa</button><button type="button" class="btn btn-secondary" data-transport-reload>Recarregar dados salvos</button></div><p class="note" data-transport-status role="status">'+(state.draft?'Alterações não salvas.':state.canWrite?'Valores consultados. Só os gastos informados serão registrados.':'Somente consulta. Renove o acesso para alterar.')+'</p></form>';
}
function loadTransportFormV723(gid,idx,freteCobrado){
 if(!finOwnerV722())return '';
 const state=transportStateV723(String(gid)),charge=Number(freteCobrado||0);
 return '<details class="card transport-load-v723 no-print" data-transport-load="'+esc(String(gid))+'"'+(state.open?' open':'')+'><summary>Gastos do transporte</summary><button type="button" class="btn btn-secondary" data-open-shared-trips>Viagem com vários clientes</button><p class="note">Frete cobrado do cliente no documento: <strong>'+moeda(charge)+'</strong>. Esse valor compõe a venda, não a despesa.</p><div data-transport-body>'+transportBodyV723(String(gid))+'</div></details>';
}
function transportRefreshViewV723(root){
 const form=root.querySelector('[data-transport-form]');if(!form)return;
 const state=transportStateV723(root.dataset.transportLoad),allowed=transportCostKeys(root.querySelector('[data-transport-mode]').value);
 for(const label of form.querySelectorAll('[data-transport-field]'))label.hidden=!allowed.includes(label.dataset.transportField);
 for(const field of form.querySelectorAll('input,select,button'))field.disabled=state.busy||(!state.canWrite&&!field.hasAttribute('data-transport-reload'));
 try{const parsed=normalizeLoadTransport(transportPayloadV723(root));root.querySelector('[data-transport-total]').textContent=parsed.mode==='customer'?'Cliente paga o transportador diretamente: nenhuma despesa da empresa será registrada.':'Despesa real desta viagem: '+finMoneyV722(parsed.totalCents)+'.';}catch{root.querySelector('[data-transport-total]').textContent='Confira os valores dos gastos.';}
}
function transportCurrentRootV723(root){return [...(document.querySelectorAll?.('[data-transport-load]')||[])].find(el=>el.dataset.transportLoad===root.dataset.transportLoad)||root;}
async function transportLoadV723(root,force=false){
 if(!finOwnerV722())return;const gid=root.dataset.transportLoad,state=transportStateV723(gid);if(state.busy||state.loaded&&!force){transportRefreshViewV723(root);return;}
 state.busy=true;transportRefreshViewV723(root);const status=root.querySelector('[data-transport-status]');if(status)status.textContent='Consultando gastos…';
 try{const result=await financeRequestV722(null,{loadId:gid},'company-transport');state.loaded=true;state.config=result.config;state.draft=null;state.canWrite=result.canWrite===true;root=transportCurrentRootV723(root);root.querySelector('[data-transport-body]').innerHTML=transportBodyV723(gid);}
 catch(e){if(status)status.textContent=e.message;}
 finally{state.busy=false;transportRefreshViewV723(root);}
}
function transportRememberV723(root){
 const state=transportStateV723(root.dataset.transportLoad);if(!state.loaded||state.busy)return;
 const costs={};for(const key of Object.keys(TRANSPORT_COSTS))costs[key]=root.querySelector('[data-transport-cost="'+key+'"]').value;
 state.draft={mode:root.querySelector('[data-transport-mode]').value,date:root.querySelector('[data-transport-date]').value,costs,revision:state.draft?.revision??state.config?.revision??0};transportRefreshViewV723(root);root.querySelector('[data-transport-status]').textContent='Alterações não salvas.';
}
async function transportSaveV723(root){
 const state=transportStateV723(root.dataset.transportLoad);if(!finOwnerV722()||state.busy||!state.loaded||!state.canWrite)return;
 let input;try{input=transportPayloadV723(root);normalizeLoadTransport(input);}catch(e){root.querySelector('[data-transport-status]').textContent=e.message;return;}
 state.busy=true;transportRefreshViewV723(root);root.querySelector('[data-transport-status]').textContent='Salvando gastos e despesa…';
 try{const result=await financeRequestV722(input,null,'company-transport');state.config=result.config;state.draft=null;financeLoadedRangeV722=null;root=transportCurrentRootV723(root);root.querySelector('[data-transport-body]').innerHTML=transportBodyV723(root.dataset.transportLoad);root.querySelector('[data-transport-status]').textContent=result.config.totalCents>0?'Gastos salvos. Despesa de '+finMoneyV722(result.config.totalCents)+' vinculada à carga no Financeiro.':'Salvo sem despesa de transporte da empresa. A despesa vinculada anterior, se existia, saiu dos cálculos.';}
 catch(e){root.querySelector('[data-transport-status]').textContent=e.message+' Os campos foram preservados.';}
 finally{state.busy=false;transportRefreshViewV723(root);}
}
setTimeout(()=>{
 document.addEventListener('toggle',event=>{const root=event.target;if(root.matches?.('[data-transport-load]')){transportStateV723(root.dataset.transportLoad).open=root.open;if(root.open)transportLoadV723(root);}},true);
 document.addEventListener('click',event=>{const button=event.target.closest('[data-transport-reload]');if(button)transportLoadV723(button.closest('[data-transport-load]'),true);});
 document.addEventListener('submit',event=>{if(!event.target.matches('[data-transport-form]'))return;event.preventDefault();transportSaveV723(event.target.closest('[data-transport-load]'));});
 for(const name of ['input','change'])document.addEventListener(name,event=>{const root=event.target.closest('[data-transport-load]');if(root&&event.target.matches('[data-transport-cost],[data-transport-mode],[data-transport-date]'))transportRememberV723(root);});
},0);
