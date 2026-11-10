const tripStateV741={id:null,revision:0,company:null,trip:null,candidates:[],trips:[],report:null,busy:false,canWrite:false,loaded:false};
const tripElV741=id=>document.getElementById(id);
function tripDateV741(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function tripScopeV741(){if(!finOwnerV722())throw Error('As viagens financeiras são exclusivas do responsável pela empresa.');if(tripStateV741.company&&tripStateV741.company!==empresaV456)throw Error('A empresa mudou. Reabra o sistema antes de continuar.');}
function tripMessageV741(text){tripElV741('tripStatusV741').textContent=text;}
function tripFieldsV741(){const s=tripStateV741;for(const field of tripElV741('tripFormV741').querySelectorAll('input,button'))field.disabled=s.busy||(!s.canWrite&&field.id!=='tripNewV741');tripElV741('tripListV741').disabled=s.busy;tripElV741('tripCancelV741').hidden=!s.trip||s.trip.status==='cancelled';if(s.trip?.status==='cancelled')for(const field of tripElV741('tripFormV741').querySelectorAll('input,button'))if(field.id!=='tripNewV741')field.disabled=true;for(const checkbox of tripElV741('tripCandidatesV741').querySelectorAll('input[data-trip-load]'))if(checkbox.dataset.tripOwner&&checkbox.dataset.tripOwner!==s.id)checkbox.disabled=true;}
function tripSelectedV741(){return [...tripElV741('tripCandidatesV741').querySelectorAll('input[data-trip-load]:checked')].map(el=>el.dataset.tripLoad);}
function tripCandidatesV741(selected=[]){
 const s=tripStateV741;tripElV741('tripCandidatesV741').innerHTML=s.candidates.map(c=>'<label class="trip-check-v741"><input type="checkbox" data-trip-load="'+esc(c.loadId)+'" data-trip-owner="'+esc(c.tripId||'')+'"'+(selected.includes(c.loadId)?' checked':'')+'><span><strong>'+esc(c.customer)+'</strong> · '+Number(c.physicalM3).toLocaleString('pt-BR',{maximumFractionDigits:4})+' m³<br><small>'+(c.tripId&&c.tripId!==s.id?'Já pertence a outra viagem.':c.exclusiveCents>0?'Gastos exclusivos já registrados: '+finMoneyV722(c.exclusiveCents):'Sem gastos exclusivos registrados.')+'</small></span></label>').join('')||'<p class="note">Nenhuma carga fechada em m³ encontrada. Ajuste as datas da consulta.</p>';tripFieldsV741();tripPreviewV741();
}
function tripPayloadV741(status='active'){
 tripScopeV741();const costs={};for(const key of Object.keys(TRIP_COSTS))costs[key]=financeCents(tripElV741('tripCost_'+key+'V741').value.trim()||'0');
 return normalizeSharedTrip({companyId:empresaV456,id:tripStateV741.id,revision:tripStateV741.revision,date:tripElV741('tripDateV741').value,destination:tripElV741('tripDestinationV741').value,truck:tripElV741('tripTruckV741').value,driver:tripElV741('tripDriverV741').value,loadIds:tripSelectedV741(),costs,status,acknowledgeExistingExpenses:tripElV741('tripAckV741').checked});
}
function tripPreviewV741(){try{const input=tripPayloadV741(),loads=input.loadIds.map(id=>tripStateV741.candidates.find(c=>c.loadId===id)),parts=allocateTripCosts(input.totalCents,loads);tripElV741('tripPreviewV741').textContent='Prévia do rateio: '+parts.map(p=>p.customer+': '+finMoneyV722(p.amountCents)).join(' · ')+'. Total: '+finMoneyV722(input.totalCents)+'. O servidor confere os volumes ao salvar.';}catch(e){tripElV741('tripPreviewV741').textContent=e.message;}}
function tripFillV741(trip=null){
 const s=tripStateV741;s.id=trip?.id||crypto.randomUUID();s.revision=trip?.revision||0;s.trip=trip;s.report=null;
 tripElV741('tripTitleV741').textContent=trip?'Viagem — '+trip.destination:'Nova viagem compartilhada';tripElV741('tripDateV741').value=trip?.date||tripDateV741();for(const key of ['destination','truck','driver'])tripElV741('trip'+key[0].toUpperCase()+key.slice(1)+'V741').value=trip?.[key]||'';
 for(const key of Object.keys(TRIP_COSTS))tripElV741('tripCost_'+key+'V741').value=((trip?.costs[key]||0)/100).toFixed(2).replace('.',',');tripElV741('tripAckV741').checked=trip?.acknowledgeExistingExpenses===true;
 tripElV741('tripReportV741').innerHTML='';tripElV741('tripPrintV741').hidden=true;tripCandidatesV741(trip?.loadIds||[]);
}
async function tripListV741(){
 const s=tripStateV741;if(s.busy)return;let selected=tripSelectedV741();
 try{tripScopeV741();s.busy=true;tripFieldsV741();tripMessageV741('Consultando cargas e viagens…');
  const result=await financeRequestV722(null,{from:tripElV741('tripFromV741').value,to:tripElV741('tripToV741').value},'company-shared-trips');s.company=result.empresaId;s.canWrite=result.canWrite===true;s.loaded=true;s.trips=result.trips;
  const oldMembers=s.candidates.filter(c=>s.trip?.loadIds.includes(c.loadId));s.candidates=[...new Map([...oldMembers,...result.candidates].map(c=>[c.loadId,c])).values()];
  tripElV741('tripSavedV741').innerHTML='<h4>Viagens salvas</h4>'+result.trips.map(t=>'<button type="button" class="btn btn-secondary" data-trip-open="'+esc(t.id)+'">'+esc(t.date+' · '+t.destination)+(t.status==='cancelled'?' · Cancelada':'')+'</button>').join('');tripCandidatesV741(selected);tripMessageV741('Consulta concluída. Gastos por cliente são mantidos separados dos gastos comuns.');
 }catch(e){tripMessageV741(e.message+' Os campos preenchidos foram preservados.');}finally{s.busy=false;tripFieldsV741();}
}
function tripReportV741(report){
 const s=tripStateV741;s.report=report;const money=n=>n===null?'Pendente':finMoneyV722(n),line=(label,value)=>'<div class="fin-sale-line-v735"><span>'+label+'</span><strong>'+money(value)+'</strong></div>';
 tripElV741('tripReportV741').innerHTML='<h4>Resultado da viagem</h4><p class="note">Visão completa dos pedidos vinculados e seus gastos, independentemente da data das despesas. No Financeiro, os valores continuam respeitando o período consultado. Despesas gerais da empresa ficam no resultado do período. O rateio usa o volume físico atual; se uma carga for alterada, a próxima consulta recalcula sua parte.</p>'+report.loads.map(l=>'<article class="fin-sale-check-v735"><h4>'+esc(l.customer)+'</h4><p class="note">'+Number(l.physicalM3).toLocaleString('pt-BR',{maximumFractionDigits:4})+' m³</p>'+line('Venda',l.amountCents)+line('− Custo da madeira',l.costCents)+line('− Gastos exclusivos',l.exclusiveCents)+line('− Parte nos gastos comuns',l.sharedCents)+line('= Resultado do cliente',l.resultCents)+(l.pendingReason?'<p class="note">'+esc(l.pendingReason)+'</p>':'')+'</article>').join('')+'<div class="fin-sale-closing-v735">'+line('Vendas da viagem',report.total.revenueCents)+line('− Madeira',report.total.costCents)+line('− Gastos exclusivos',report.total.exclusiveCents)+line('− Gastos compartilhados (uma vez)',report.total.sharedCents)+line('= Resultado total',report.total.resultCents)+'</div>';tripElV741('tripPrintV741').hidden=report.trip.status!=='active'||report.needsReview===true;
}
async function tripOpenV741(id){
 const s=tripStateV741;if(s.busy)return;try{tripScopeV741();s.busy=true;tripFieldsV741();tripMessageV741('Conferindo a viagem…');const report=await financeRequestV722(null,{id},'company-shared-trips');s.company=report.empresaId;s.canWrite=report.canWrite===true;
  for(const l of report.loads){const c={loadId:l.loadId,customer:l.customer,physicalM3:l.physicalM3,exclusiveCents:l.exclusiveCents,tripId:report.trip.status==='active'?id:null};s.candidates=[...s.candidates.filter(x=>x.loadId!==l.loadId),c];}
  tripFillV741(report.trip);tripReportV741(report);tripMessageV741('Viagem carregada. Confira clientes e gastos antes de alterar.');
 }catch(e){tripMessageV741(e.message);}finally{s.busy=false;tripFieldsV741();}
}
async function tripSaveV741(cancel=false){
 const s=tripStateV741;if(s.busy||!s.canWrite)return;let input;try{input=tripPayloadV741(cancel?'cancelled':'active');}catch(e){tripMessageV741(e.message);return;}
 if(cancel&&!confirm('Cancelar somente esta viagem e seus gastos compartilhados? Os pedidos, as vendas e os gastos exclusivos continuam preservados.'))return;
 try{s.busy=true;tripFieldsV741();tripMessageV741('Salvando viagem e despesa única…');const {totalCents,...request}=input;const result=await financeRequestV722(request,null,'company-shared-trips');s.trip=result.trip;s.revision=result.trip.revision;s.company=result.empresaId;tripElV741('tripTitleV741').textContent='Viagem — '+result.trip.destination;financeLoadedRangeV722=null;
  for(const c of s.candidates)if(c.tripId===s.id||input.loadIds.includes(c.loadId))c.tripId=cancel?null:input.loadIds.includes(c.loadId)?s.id:null;
  tripMessageV741(cancel?'Viagem cancelada. Pedidos e estoque preservados.':'Viagem salva. Os gastos compartilhados entram uma vez no Financeiro.');
  if(!cancel){try{tripReportV741(await financeRequestV722(null,{id:s.id},'company-shared-trips'));}catch(e){tripMessageV741('A viagem foi salva, mas a conferência não carregou: '+e.message+' Use Consultar cargas e viagens.');}}else{tripElV741('tripReportV741').innerHTML='';tripElV741('tripPrintV741').hidden=true;}
 }catch(e){tripMessageV741(e.message+' Os campos e a identificação da viagem foram preservados para tentar novamente.');}finally{s.busy=false;tripFieldsV741();}
}
function openSharedTripsV741(){if(!finOwnerV722())return;if(typeof pcAtivarAba==='function')pcAtivarAba('relatorios');selectReportsViewV722('finance');const root=tripElV741('sharedTripsV741');root.open=true;root.scrollIntoView({block:'start',behavior:'smooth'});}
setTimeout(()=>{
 const root=tripElV741('sharedTripsV741');if(!root)return;const today=tripDateV741();tripElV741('tripFromV741').value=today.slice(0,8)+'01';tripElV741('tripToV741').value=today;tripFillV741();
 root.addEventListener('toggle',()=>{if(root.open&&!tripStateV741.loaded)tripListV741();});tripElV741('tripListV741').onclick=tripListV741;tripElV741('tripNewV741').onclick=()=>{if(!tripStateV741.busy){tripFillV741();tripMessageV741('Nova viagem. As viagens salvas continuam preservadas.');}};
 tripElV741('tripFormV741').onsubmit=e=>{e.preventDefault();tripSaveV741();};tripElV741('tripCancelV741').onclick=()=>tripSaveV741(true);
 for(const event of ['input','change'])tripElV741('tripFormV741').addEventListener(event,()=>{tripStateV741.report=null;tripElV741('tripPrintV741').hidden=true;tripElV741('tripReportV741').innerHTML='';tripPreviewV741();});root.addEventListener('click',e=>{const b=e.target.closest('[data-trip-open]');if(b)tripOpenV741(b.dataset.tripOpen);});
 tripElV741('tripPrintV741').onclick=()=>{if(!tripStateV741.report)return;const pop=window.open('','_blank');if(!pop){tripMessageV741('Permita abrir a janela do romaneio para imprimir ou salvar PDF.');return;}pop.opener=null;pop.document.open();pop.document.write(sharedTripDocument(tripStateV741.report));pop.document.close();pop.focus();pop.print();};
 document.addEventListener('click',e=>{if(e.target.closest('[data-open-shared-trips]'))openSharedTripsV741();});
},0);
